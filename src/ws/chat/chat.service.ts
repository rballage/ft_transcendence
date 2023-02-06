import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { UsersService } from "src/users/users.service";

import { PrismaService } from "src/prisma.service";
import { Namespace, Server, Socket } from "socket.io";
import { ReceivedJoinRequest, ReceivedLeaveRequest, ReceivedMessage } from "src/utils/dto/ws.input.dto";
import { join_channel_output, MessageStatus, Message_Aknowledgement_output, UserInfo } from "src/utils/types/ws.output.types";
import * as bcrypt from "bcrypt";
import { eChannelType, eRole, eSubscriptionState, Message } from "@prisma/client";
import { ChannelCreationDto } from "src/utils/dto/users.dto";

@Injectable()
export class ChatService {
    public server: Server = null;
    public socketMap: Map<string, Socket> = null;
    private readonly logger = new Logger(ChatService.name);

    constructor(private readonly prismaService: PrismaService) {}

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

    async leaveChannel(client: Socket, data: ReceivedLeaveRequest) {
        this.logger.verbose(`${client.data.username} left channel: ${data.channelId}`);
        client.leave(data.channelId);
    }

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
    async createChannel(username: string, channelCreationDto: ChannelCreationDto) {
        const hashedPassword = await bcrypt.hash(channelCreationDto.password, 10);
        let userArray: any[];
        userArray.push({ username: username, role: "OWNER" });
        channelCreationDto.username.forEach((username) => {
            userArray.push({ username: username, role: "USER" });
        });
        return await this.prismaService.createChannel(username, channelCreationDto.name, channelCreationDto.channel_type, hashedPassword, userArray).catch((error) => {
            throw new BadRequestException([""]);
        });
    }
}
