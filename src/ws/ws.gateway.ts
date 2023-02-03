import { CACHE_MANAGER, Inject, Logger, UseGuards } from "@nestjs/common";
import { Cache } from "cache-manager";

import { OnGatewayInit, SubscribeMessage, WebSocketGateway, OnGatewayConnection, OnGatewayDisconnect, WebSocketServer, WsException } from "@nestjs/websockets";
import { Namespace, Server, Socket } from "socket.io";
import { AuthService } from "src/auth/auth.service";
import { UsersService } from "src/users/users.service";
import { ITokenPayload } from "src/auth/auths.interface";
import { UserWhole } from "src/utils/types/users.types";
import { GameInvitePayload, GameOptions, ReceivedJoinRequest, ReceivedLeaveRequest, ReceivedMessage } from "../utils/dto/ws.input.dto";
import { join_channel_output, Error_dto, UserInfo, MessageStatus, Message_Aknowledgement_output } from "../utils/types/ws.output.types";
import { PrismaService } from "src/prisma.service";
import { eSubscriptionState, eChannelType, eRole, Message } from "@prisma/client";

import * as bcrypt from "bcrypt";
import { GameService } from "./game/game.service";
import { ChatService } from "./chat/chat.service";

@WebSocketGateway({
    cors: ["*"],
    origin: ["*"],
    path: "/api/ws/",
})
export class WsGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    private readonly logger = new Logger(WsGateway.name);
    private socketMap = new Map<string, Socket>();

    constructor(
        private prismaService: PrismaService,
        private readonly usersService: UsersService,
        private readonly authService: AuthService,
        private readonly gameService: GameService,
        private readonly chatService: ChatService,
        @Inject(CACHE_MANAGER) private users: Cache
    ) {}

    @WebSocketServer()
    server: Server;

    afterInit() {
        this.logger.verbose("WsGateway Initialized");
        this.gameService.server = this.server;
        this.chatService.server = this.server;
    }

    async handleConnection(client: Socket) {
        try {
            console.log(client.id);
            const verifiedPayload: ITokenPayload = this.authService.verifyToken(client.handshake.auth.token);
            client.data.username = verifiedPayload.username as string;

            const user: UserWhole = await this.usersService.getWholeUser(client.data.username);
            this.socketMap.set(client.data.username, client);
            await this.users.set(client.data.username, { ...user, socket_id: client.id } as any, 0);

            this.logger.verbose(`User ${client.data.username} connected`);
            this.server.emit("user-connected", Array.from(this.socketMap.keys()));
        } catch (e) {
            if (client?.data?.username) await this.users.del(client.data.username);
            this.socketMap.delete(client.data.username);

            client.disconnect();
        }
    }

    async handleDisconnect(client: Socket) {
        this.logger.verbose(`User ${client.data.username} disconnected`);
        this.server.emit("user-disconnected", client.data.username);
        await this.users.del(client.data.username);
        this.socketMap.delete(client.data.username);
        client.disconnect();
    }

    @SubscribeMessage("join-channel")
    async joinChannel(client: Socket, data: ReceivedJoinRequest): Promise<join_channel_output> {
        let channelInfo = null;
        try {
            channelInfo = await this.getSubscription(data.channelId, client.data.username);
        } catch (e) {
            return {
                status: "error",
                message: e.message,
                data: { channelId: data.channelId, username: client.data.username },
            } as join_channel_output;
        }
        if (channelInfo.channel.hash && !bcrypt.compare(data.password, channelInfo.channel.hash))
            return {
                status: "error",
                message: "invalid password",
                data: { channelId: data.channelId, username: client.data.username },
            } as join_channel_output;
        client.join(data.channelId);
        return {
            status: "OK",
            message: null,
            data: {
                channelId: channelInfo.channel.id as string,
                name: channelInfo.channel.name as string,
                channel_type: channelInfo.channel.channel_type as eChannelType,
                messages: channelInfo.channel.messages as Message[],
                role: channelInfo.role as eRole,
                SubscribedUsers: channelInfo.channel.SubscribedUsers as UserInfo[],
                state: channelInfo.state as eSubscriptionState,
                stateActiveUntil: channelInfo.stateActiveUntil as Date,
            },
        } as join_channel_output;
    }

    @SubscribeMessage("leave-channel")
    async leaveChannel(client: Socket, data: ReceivedLeaveRequest) {
        this.logger.verbose(`${client.data.username} left channel: ${data.channelId}`);
        client.leave(data.channelId);
    }

    @SubscribeMessage("message")
    async handleNewMessage(client: Socket, data: ReceivedMessage): Promise<Message_Aknowledgement_output> {
        let channelInfo = null;
        try {
            channelInfo = await this.getSubscription(data.channelId, client.data.username);
        } catch (e) {
            return { status: "INVALID_CHANNEL" as MessageStatus, channelId: data.channelId };
        }
        if (channelInfo.channel.hash) {
            const hash_check = await bcrypt.compare(data.password, channelInfo.channel.hash);
            if (!hash_check) {
                client.leave(data.channelId);
                return {
                    status: "INVALID_PASSWORD" as MessageStatus,
                    channelId: data.channelId,
                    comment: "You have been kicked of the channel, please type new password or leave for ever",
                };
            }
            // this.server.in(data.channelId).emit("message", data);
        }
        // check if channel exists and that the user is in the channel
        // check if the user is authorized to post message, cf, not BANNED or MUTED
        // check if the password sent along the message is correct
        // if so,
        // 1. save the message to the database
        // 2. broadcast the message to the channel-room
        const message = await this.prismaService.message.create({
            data: {
                channelId: data.channelId,
                username: client.data.username,
                content: data.content,
            },
        });
        console.log(message);
        this.logger.verbose(`${client.data.username} sent a new message: ${JSON.stringify(data.content)} in channel: ${data.channelId}`);
        const output = {
            id: message.id,
            CreatedAt: message.CreatedAt,
            ReceivedAt: message.CreatedAt,
            content: message.content,
            username: message.username,
            channel_id: message.channelId,
        };
        this.server.in(data.channelId).emit("message", output);
    }

    async getSubscription(channelId: string, username: string) {
        return await this.prismaService.subscription.findFirstOrThrow({
            where: {
                AND: [{ channelId: channelId }, { username: username }],
            },
            select: {
                role: true,
                stateActiveUntil: true,
                state: true,
                channel: {
                    select: {
                        SubscribedUsers: {
                            select: {
                                username: true,
                                role: true,
                            },
                        },
                        messages: {
                            select: {
                                username: true,
                                CreatedAt: true,
                                id: true,
                                content: true,
                            },
                        },
                        hash: true,
                        id: true,
                        name: true,
                        channel_type: true,
                    },
                },
            },
        });
    }

    @SubscribeMessage("game-invite")
    gameInvite(client: Socket, data: GameInvitePayload) {
        let canceled: boolean = false;
        console.log(data);
        const targetSocket: any = this.socketMap.get(data.target_user);
        if (targetSocket && !this.gameService.isTargetBusy(data.target_user)) {
            client.once("game-invite-canceled", () => {
                targetSocket.emit("game-invite-canceled", "CANCELED");
                canceled = true;
            });
            client.once("disconnect", () => {
                targetSocket.emit("game-invite-canceled", "CANCELED");
                canceled = true;
            });
            targetSocket.once("disconnect", () => {
                client.emit("game-invite-declined", "DECLINED");
                canceled = true;
            });
            targetSocket.timeout(30000).emit("game-invite", { ...data, from: client.data.username }, async (err, response) => {
                if (!canceled && response === "ACCEPTED") {
                    client.removeAllListeners("game-invite-canceled");
                    client.emit("game-invite-accepted");
                    this.gameService.createGame(client, targetSocket, { difficulty: data.difficulty, map: data.map } as GameOptions);
                } else if (canceled && !err) {
                    // client.emit("game-invite-declined");
                    targetSocket.emit("game-invite-canceled", "CANCELED");
                } else if (err) {
                    client.emit("game-invite-declined", "TIMEOUT");
                    targetSocket.emit("game-invite-canceled", "CANCELED");
                } else if (response !== "ACCEPTED") {
                    client.emit("game-invite-declined", "DECLINED");
                }
            });
        } else {
            client.emit("game-invite-declined", "NOT_CONNECTED");
        }
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
