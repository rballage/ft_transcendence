import { CACHE_MANAGER, Inject, Logger, UseGuards } from '@nestjs/common';
import {Cache} from 'cache-manager';

import { JwtService } from '@nestjs/jwt';
import { OnGatewayInit, SubscribeMessage, WebSocketGateway, OnGatewayConnection, OnGatewayDisconnect, WebSocketServer, WsException } from '@nestjs/websockets';
import { Server, Namespace, Socket } from 'socket.io';
import { AuthService } from 'src/auth/auth.service';
import { UsersService } from 'src/users/users.service';
import { ITokenPayload } from 'src/auth/auths.interface';
import { UserWhole } from 'src/users/types/users.types';
import { GameInvitePayload, ReceivedJoinRequest, ReceivedLeaveRequest, ReceivedMessage } from './dto/ws.input.dto';
// import { PrismaService } from 'src/prisma.service';
import { join_channel_output, Error_dto, UserInfo, MessageStatus, Message_Aknowledgement_output } from './types/ws.output.types';
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
	private gamesMap = new Map<string, any>;

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
			this.server.emit('user-connected', Array.from(this.socketMap.keys()));
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
		this.socketMap.delete(client.data.username);
		this.server.emit('user-disconnected', client.data.username);
		await this.users.del(client.data.username);
	}

	@SubscribeMessage('join-channel')
	async joinChannel(client: Socket, data : ReceivedJoinRequest): Promise<join_channel_output> {
		let channelInfo = null
		try {
			channelInfo = await this.getSubscription(data.channelId, client.data.username);
		}
		catch (e) {
			this.logger.warn(e);
			return {status : 'error', message : e.message, data : {channelId : data.channelId, username : client.data.username}} as join_channel_output;
		}
		if (channelInfo.channel.hash && !bcrypt.compare(data.password, channelInfo.channel.hash))
			return {status : 'error', message : 'invalid password', data : {channelId : data.channelId, username : client.data.username}} as join_channel_output;
		this.logger.verbose(`User ${client.data.username} joined channel ${data.channelId}`);
		client.join(data.channelId);
		return {status: 'OK', message: null, data: {
			channelId: channelInfo.channel.id as string,
			name: channelInfo.channel.name as string,
			channel_type: channelInfo.channel.channel_type as eChannelType,
			messages: channelInfo.channel.messages as Message[],
			role: channelInfo.role as eRole,
			SubscribedUsers: channelInfo.channel.SubscribedUsers as UserInfo[],
			state: channelInfo.state as eSubscriptionState,
			stateActiveUntil: channelInfo.stateActiveUntil as Date,
		}} as join_channel_output;
	}

	@SubscribeMessage('leave-channel')
	async leaveChannel(client: Socket, data : ReceivedLeaveRequest) {
		this.logger.verbose(`${client.data.username} left channel: ${data.channelId}`)
		client.leave(data.channelId);
	}
	@SubscribeMessage('message')
	async handleNewMessage(client: Socket, data : ReceivedMessage) : Promise<Message_Aknowledgement_output> {
		let channelInfo = null
		try {
			channelInfo = await this.getSubscription(data.channelId, client.data.username);
		}
		catch (e) {
			return {status : 'INVALID_CHANNEL' as MessageStatus, channelId: data.channelId }
		}
		if (channelInfo.channel.hash)
		{
			const hash_check = await bcrypt.compare(data.password, channelInfo.channel.hash)
			if (!hash_check)
			{
				client.leave(data.channelId);
				return {status : 'INVALID_PASSWORD' as MessageStatus, channelId: data.channelId, comment: 'You have been kicked of the channel, please type new password or leave for ever'}
			}
		}
		// check if channel exists and that the user is in the channel
		// check if the user is authorized to post message, cf, not BANNED or MUTED
		// check if the password sent along the message is correct
		// if so,
		// 1. save the message to the database
		// 2. broadcast the message to the channel-room
		this.logger.verbose(`${client.data.username} sent a new message: ${JSON.stringify(data.content)} in channel: ${data.channelId}`)
		this.server.in(data.channelId).emit('message', {
			channel_id: data.channelId,
			username: client.data.username,
			content: data.content,
		});
	}

	async getSubscription(channelId: string, username : string) {
			return await this.prismaService.subscription.findFirstOrThrow({
			where: {
				AND: [{channelId: channelId}, {username: username}]
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
		console.log(data)
		let canceled : boolean = false
		const targetSocket : any = this.socketMap.get(data.target_user)
		if (targetSocket) {
			client.on('game-invite-canceled', () => {
				targetSocket.emit('game-invite-canceled');
				canceled = true
			})
			targetSocket.timeout(5000).emit('game-invite', {...data, from: client.data.username}, (err, response) => {
				console.log(response)
				if (canceled || err || response !== 'ACCEPTED') {
					console.log(`${data.target_user} declined`)
					client.emit('game-invite-declined')
					targetSocket.emit('game-invite-canceled')
				}
				else {
					console.log(`${data.target_user} accepted`)
					// this.logger.verbose(response)
					client.emit('game-invite-accepted')
					console.log('yo')
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
            });
		}
	}
	@SubscribeMessage('game-update')
	async gameUpdate(client: Socket, data : any) {
		// mapdegame(client.data.).updatePlayPosition(client)
		// client.on('caca', ()=> console.log('caca', client.data.username))
	}
}

class UneGame {
	gameId : string;
	socketP1 : Socket;
	socketP2 : Socket;
	intervalId : NodeJS.Timer;

	constructor(gameId: string, socketp1 : Socket, socketp2 : Socket, private readonly server : Namespace) {
		this.gameId = gameId
		this.socketP1 = socketp1
		this.socketP2 = socketp2
		this.socketP1.join(gameId)
		this.socketP2.join(gameId)
		this.socketP1.on(`${gameId}___mousemove`, this.updatePositionP1)
		this.socketP2.on(`${gameId}___mousemove`, this.updatePositionP2)
		this.socketP1.on('disconnect', this.disconnectedP1)
		this.socketP2.on('disconnect', this.disconnectedP2)
	}

	updatePositionP1(socket, data){
		// this.x = data.x
	}
	updatePositionP2(socket, data){
		// this.x = data.x
	}

	startGame(data : any){
		this.intervalId = setInterval(() => {
			// this.play();
			this.server.in(this.gameId).emit('frame-update', null) // <-- aymeric tu met un callback ici qui va get les info de la next frame
		})

	}
	disconnectedP1()
	{
	}

	disconnectedP2()
	{
	}

	stopGame()
	{
		clearInterval(this.intervalId);
		this.server.in(this.gameId).emit('game-end', {})
		this.socketP1.leave(this.gameId)
		this.socketP2.leave(this.gameId)
		this.socketP1.removeListener(`${this.gameId}___mousemove`, this.updatePositionP1)
		this.socketP2.removeListener(`${this.gameId}___mousemove`, this.updatePositionP2)
		this.socketP1.removeListener('disconnected', this.disconnectedP1)
		this.socketP2.removeListener('disconnected', this.disconnectedP2)
	}

}
