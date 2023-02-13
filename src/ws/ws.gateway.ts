import { Logger } from "@nestjs/common";
import { OnGatewayInit, SubscribeMessage, WebSocketGateway, OnGatewayConnection, OnGatewayDisconnect, WebSocketServer, WsException } from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { AuthService } from "src/auth/auth.service";
import { ITokenPayload } from "src/auth/auths.interface";
import { GameInvitePayload, ReceivedJoinRequest, ReceivedLeaveRequest, ReceivedMessage } from "../utils/dto/ws.input.dto";
import { join_channel_output, Message_Aknowledgement_output } from "../utils/types/ws.output.types";
import { PrismaService } from "src/prisma.service";
import { GameService } from "./game/game.service";
import { ChatService } from "./chat/chat.service";
import { WsService } from "./ws.service";

@WebSocketGateway({
    cors: ["*"],
    origin: ["*"],
    path: "/api/ws/",
})
export class WsGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    private readonly logger = new Logger(WsGateway.name);
    private socketMap = new Map<string, Socket>();

    constructor(private readonly authService: AuthService, private readonly gameService: GameService, private readonly chatService: ChatService, private readonly wsService: WsService) {}

    @WebSocketServer()
    server: Server;

    afterInit() {
        this.wsService.server = this.server;
        this.wsService.socketMap = this.socketMap;
        this.gameService.server = this.server;
        this.gameService.socketMap = this.socketMap;
        this.chatService.server = this.server;
        this.chatService.socketMap = this.socketMap;
        this.logger.verbose("WsGateway Initialized");
    }

    async handleConnection(client: Socket) {
        try {
            const verifiedPayload: ITokenPayload = this.authService.verifyToken(client.handshake.auth.token);
            client.data.username = verifiedPayload.username as string;
            this.socketMap.set(client.data.username, client);
            this.logger.verbose(`User ${client.data.username} connected`);
            this.server.emit("user-connected", Array.from(this.socketMap.keys()));
        } catch (e) {
            this.socketMap.delete(client.data.username);
            client.disconnect();
        }
    }

    async handleDisconnect(client: Socket) {
        this.logger.verbose(`User ${client.data.username} disconnected`);
        this.server.emit("user-disconnected", client.data.username);
        this.socketMap.delete(client.data.username);
        client.disconnect();
    }

    @SubscribeMessage("join-channel")
    async joinChannel(client: Socket, data: ReceivedJoinRequest): Promise<join_channel_output> {
        return this.chatService.joinChannel(client, data);
    }

    @SubscribeMessage("leave-channel")
    async leaveChannel(client: Socket, data: ReceivedLeaveRequest) {
        return this.chatService.leaveChannel(client, data);
    }

    @SubscribeMessage("message")
    async handleNewMessage(client: Socket, data: ReceivedMessage): Promise<Message_Aknowledgement_output> {
        return this.chatService.handleNewMessage(client, data);
    }

    @SubscribeMessage("game-invite")
    gameInvite(client: Socket, data: GameInvitePayload) {
        return this.gameService.gameInvite(client, data);
    }

    @SubscribeMessage("watch-game")
    addSpectator(client: Socket, gameId: string) {
        try {
            this.gameService.addSpectator(client, gameId);
        } catch (err) {
            return err;
        }
        return "OK";
    }
    @SubscribeMessage("unwatch-game")
    removeSpectator(client: Socket, gameId: string) {
        this.gameService.removeSpectator(client, gameId);
    }
}
