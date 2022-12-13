import { Logger } from '@nestjs/common';
import { OnGatewayInit, SubscribeMessage, WebSocketGateway, OnGatewayConnection, OnGatewayDisconnect, WebSocketServer } from '@nestjs/websockets';
import { Namespace, Socket } from 'socket.io';
import { UsersService } from 'src/users/users.service';

@WebSocketGateway({
	namespace: 'api/ws',
	// cors: ['*']
})
export class WsGateway implements
OnGatewayInit,
OnGatewayConnection,
OnGatewayDisconnect {
	private readonly logger = new Logger(WsGateway.name);

    constructor(private readonly usersService: UsersService) {}

	@WebSocketServer()
	io : Namespace;

	afterInit(server: any) {
		this.logger.verbose('WsGateway Initialized');
	}

	handleConnection(client: Socket, ...args: any[]) {
		this.logger.log(Socket + ' connected');
		this.io.emit('yo', client.id);
		return 'OK'

		// throw new Error('Method not implemented.');
	}
	
	handleDisconnect(client: Socket) {
				this.logger.log(Socket + ' diconnected');
		return 'OK'
	}


	@SubscribeMessage('message')
	handleMessage(client: Socket, payload: any) {
				this.logger.log(payload);
		return 'OK'
	}
}
