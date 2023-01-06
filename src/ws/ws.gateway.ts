import { CACHE_MANAGER, Inject, Logger, UseGuards } from '@nestjs/common';
import {Cache} from 'cache-manager';

import { JwtService } from '@nestjs/jwt';
import { OnGatewayInit, SubscribeMessage, WebSocketGateway, OnGatewayConnection, OnGatewayDisconnect, WebSocketServer } from '@nestjs/websockets';
import { Server, Namespace, Socket } from 'socket.io';
import { AuthService } from 'src/auth/auth.service';
import { UsersService } from 'src/users/users.service';
import { ITokenPayload } from 'src/auth/auths.interface';
import { UserWhole } from 'src/users/types/users.types';
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

    constructor(private readonly usersService: UsersService, private readonly authService: AuthService, @Inject(CACHE_MANAGER) private users: Cache) {}

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

	@SubscribeMessage('coucou')
	test(client: Socket){
		client.emit('coucou toi meme');
	}
}
