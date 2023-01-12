import { CACHE_MANAGER, Inject, Logger, UseGuards } from '@nestjs/common';
import {Cache} from 'cache-manager';

import { JwtService } from '@nestjs/jwt';
import { OnGatewayInit, SubscribeMessage, WebSocketGateway, OnGatewayConnection, OnGatewayDisconnect, WebSocketServer, WsException } from '@nestjs/websockets';
import { Server, Namespace, Socket } from 'socket.io';
import { AuthService } from 'src/auth/auth.service';
import { UsersService } from 'src/users/users.service';
import { ITokenPayload } from 'src/auth/auths.interface';
import { UserWhole } from 'src/users/types/users.types';
import { ReceivedJoinRequest } from './dto/ws.input.dto';
// import { PrismaService } from 'src/prisma.service';
import { join_channel_output, Error_dto } from './types/ws.output.types';
import { PrismaService } from 'src/prisma.service';
import { User, Game , Avatar, Channel, Subscription, eSubscriptionState, eChannelType, eRole} from '@prisma/client';


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

    constructor(private prismaService:PrismaService, private readonly usersService: UsersService, private readonly authService: AuthService, @Inject(CACHE_MANAGER) private users: Cache) {}

	@WebSocketServer()
	server : Namespace;

	afterInit(server: any) {
		this.logger.verbose('WsGateway Initialized');
	}
	
	async handleConnection(client: Socket) {
		try {
			const verifiedPayload : ITokenPayload = this.authService.verifyToken(client.handshake.auth.token);
			client.data.username = verifiedPayload.username as string;
			const user : UserWhole = await this.usersService.getWholeUser(client.data.username);
			await this.users.set(client.id, user, 0);
			this.logger.verbose(`User ${client.data.username} connected`);
			this.server.emit('user-connected', client.data.username);
		}
		catch (e) {
			await this.users.del(client.id);
			client.disconnect();
		}
	}
	
	async handleDisconnect(client: Socket) {
		this.logger.verbose(`User ${client.data.username} disconnected`);
		this.server.emit('user-disconnected', client.data.username);
		// await this.users.del(client.id);
	}

	@SubscribeMessage('join-channel')
	async joinChannel(client: Socket, data : ReceivedJoinRequest) : Promise<any> {
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
		return {status: 'OK', data: {
			channel_id: channelInfo.channel.id as string,
			name: channelInfo.channel.name as string,
			channel_type: channelInfo.channel.channel_type as eChannelType,
			messages: channelInfo.channel.messages,
			role: channelInfo.role as eRole,
			users: channelInfo.channel.SubscribedUsers,
			state: channelInfo.state as eSubscriptionState,
			stateActiveUntil: channelInfo.stateActiveUntil as Date,
		}} as join_channel_output;
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
	// @SubscribeMessage('invite-to-game')
	// async gameInvite(client: Socket, data : any) {
	// 	this.server.to(data.username).emit('');
	// 	// try {
	// 	// 	// const channel = await this.prismaService.channel.findUnique({where : {id : data.channel_id}})
	// 	// 	// client.join(data.channel_id);
	// 	// 	// client.emit("infos", {}); // envoyer aussi tout les messages precedent

	// 	// }
	// 	// catch (e) {
	// 	// 	client.emit('error', {
	// 	// 		channel_id: data.channel_id, content : { message : e.message }
	// 	// 	} as Error_dto)
	// 	// }

	// }
}
