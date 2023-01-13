import { CACHE_MANAGER, Inject, Logger, UseGuards } from '@nestjs/common';
import {Cache} from 'cache-manager';

import { JwtService } from '@nestjs/jwt';
import { OnGatewayInit, SubscribeMessage, WebSocketGateway, OnGatewayConnection, OnGatewayDisconnect, WebSocketServer, WsException } from '@nestjs/websockets';
import { Server, Namespace, Socket } from 'socket.io';
import { AuthService } from 'src/auth/auth.service';
import { UsersService } from 'src/users/users.service';
import { ITokenPayload } from 'src/auth/auths.interface';
import { UserWhole } from 'src/users/types/users.types';
import { GameInvitePayload, ReceivedJoinRequest, ReceivedLeaveRequest } from './dto/ws.input.dto';
// import { PrismaService } from 'src/prisma.service';
import { join_channel_output, Error_dto, UserInfo } from './types/ws.output.types';
import { PrismaService } from 'src/prisma.service';
import { User, Game , Avatar, Channel, Subscription, eSubscriptionState, eChannelType, eRole, Message} from '@prisma/client';


import * as bcrypt from 'bcrypt';

@WebSocketGateway({
	namespace: '/api/ws',
	cors: ['*'],
	origin: ["*"],
})
export class WsGateway implements
OnGatewayInit,
OnGatewayConnection,
OnGatewayDisconnect {
	private readonly logger = new Logger(WsGateway.name);
	private socketMap = new Map<string, Socket>;

    constructor(
		private prismaService:PrismaService,
		private readonly usersService: UsersService, 
		private readonly authService: AuthService, 
		@Inject(CACHE_MANAGER) private users: Cache) {}

	@WebSocketServer()
	server : Namespace;

	afterInit(server: any) {
		this.logger.verbose('WsGateway Initialized');
	}
	
	async handleConnection(client: Socket) {
		try {
			const verifiedPayload : ITokenPayload = this.authService.verifyToken(client.handshake.auth.token);
			console.log(verifiedPayload)
			client.data.username = verifiedPayload.username as string;
			console.log('B')

			const user : UserWhole = await this.usersService.getWholeUser(client.data.username);
			console.log('C')
			this.socketMap.set(client.data.username, client);
			await this.users.set(client.data.username, {...user, socket_id: client.id} as any, 0);
			console.log('D')

			this.logger.verbose(`User ${client.data.username} connected`);
			this.server.emit('user-connected', client.data.username);
		}
		catch (e) {
			console.log(e)
			if (client?.data?.username)
				await this.users.del(client.data.username);
			this.socketMap.delete(client.data.username);
			
			client.disconnect();
		}
	}
	
	async handleDisconnect(client: Socket) {
		this.logger.verbose(`User ${client.data.username} disconnected`);
		this.server.emit('user-disconnected', client.data.username);
		this.socketMap.delete(client.data.username);
		await this.users.del(client.data.username);
	}

	@SubscribeMessage('join-channel')
	async joinChannel(client: Socket, data : ReceivedJoinRequest): Promise<join_channel_output> {
		let channelInfo = null
		try {
			channelInfo = await this.getSubscription(data.channel_id, client.data.username);
		}
		catch (e) {
			this.logger.warn(e);
			return {status : 'error', message : e.message, data : {channel_id : data.channel_id, username : client.data.username}} as join_channel_output;
		}
		if (channelInfo.channel.hash && !bcrypt.compare(data.password, channelInfo.channel.hash))
			return {status : 'error', message : 'invalid password', data : {channel_id : data.channel_id, username : client.data.username}} as join_channel_output;
		client.join(data.channel_id);
		return {status: 'OK', message: null, data: {
			channel_id: channelInfo.channel.id as string,
			name: channelInfo.channel.name as string,
			channel_type: channelInfo.channel.channel_type as eChannelType,
			messages: channelInfo.channel.messages as Message[],
			role: channelInfo.role as eRole,
			users: channelInfo.channel.SubscribedUsers as UserInfo[],
			state: channelInfo.state as eSubscriptionState,
			stateActiveUntil: channelInfo.stateActiveUntil as Date,
		}} as join_channel_output;
	}

	@SubscribeMessage('leave-channel')
	async leaveChannel(client: Socket, data : ReceivedLeaveRequest) {
		this.logger.verbose(`${client.data.username} left channel: ${data.channel_id}`)
		client.leave(data.channel_id);
	}

	async getSubscription(channel_id: string, username : string) {
			return await this.prismaService.subscription.findFirstOrThrow({
			where: {
				AND: [{channelId: channel_id}, {username: username}]
			},
			select: {
				role: true,
				stateActiveUntil: true,
				state: true,
				channel : {
					select: {
						SubscribedUsers : {
							select: {
								username: true,
								role: true
							}
						},
						messages : {
							select: {
								username: true,
								CreatedAt:true,
								id: true,
								content: true
							}
						},
						hash:true,
						id: true,
						name: true,
						channel_type: true
					}
				}
			}
		})
	}

	@SubscribeMessage('game-invite')
	async gameInvite(client: Socket, data : GameInvitePayload) {
		const targetSocket : any = this.socketMap.get(data.target_user)
		console.log(data)
		if (targetSocket) {
			targetSocket.timeout(30000).emit('game-invite', {...data, from: client.data.username}, (err, response) => {
				if (err || response !== 'ACCEPTED') {
					this.logger.error('A', err)

					client.emit('game-invite-declined')
				}
				else {
					this.logger.verbose(response)
					client.timeout(1000).emit('game-invite-accepted', (err, response) => {
						if (err|| response !== 'ACCEPTED') {
							targetSocket.emit('game-invite-canceled')
						}
						else {
							// create game, join client and target user in game-room as p1 and p2 respectively
							const a_game_placeholder = {
								id: 'auniquegameid',
								playerOneName: client.data.username,
								playerTwoName: data.target_user,
								options: data
							}
							targetSocket.join(a_game_placeholder.id)
							client.join(a_game_placeholder.id)
							this.server.in(a_game_placeholder.id).emit('game-start', a_game_placeholder)
							// should also emit an event to all clients with the game info so they can watch the game ? or do we do that elsewhere ?
							this.logger.verbose("game started") // should launch a game ? how do we do that aymeric ?
						}
					})
                }
			});
		}
	}
}
