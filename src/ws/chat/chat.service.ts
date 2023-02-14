import { BadRequestException, ForbiddenException, Injectable, Logger, UnauthorizedException } from "@nestjs/common";
import { PrismaService } from "src/prisma.service";
import { Server, Socket } from "socket.io";
import { ReceivedJoinRequest, ReceivedLeaveRequest, ReceivedMessage } from "src/utils/dto/ws.input.dto";
import { join_channel_output, MessageStatus, Message_Aknowledgement_output, UserInfo } from "src/utils/types/ws.output.types";
import * as bcrypt from "bcrypt";
import { eChannelType, eRole, eSubscriptionState, Message, Subscription, User } from "@prisma/client";
import { ChannelCreationDto, UsernameDto, UserStateDTO } from "src/utils/dto/users.dto";
import { getRelativeDate } from "src/utils/helpers/getRelativeDate";
import { SubInfosWithChannelAndUsers, subQuery, whereUserIsInChannel } from "src/utils/types/chat.queries";
import { filterInferiorRole, throwIfRoleIsInferiorOrEqualToTarget } from "src/utils/helpers/roles-helper";
import { SchedulerRegistry } from "@nestjs/schedule";

@Injectable()
export class ChatService {
    public server: Server = null;
    public socketMap: Map<string, Socket> = null;
    private readonly logger = new Logger(ChatService.name);

    constructor(private readonly prismaService: PrismaService, private readonly schedulerRegistry: SchedulerRegistry) {
        this.__resumeScheduleStateResets();
    }

    async joinChannel(client: Socket, data: ReceivedJoinRequest): Promise<join_channel_output> {
        let channelInfo = null;
        try {
            channelInfo = await this.prismaService.getSubscriptionAndChannel(data.channelId, client.data.username);
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
        // BANNED
        if (channelInfo.state == eSubscriptionState.BANNED) {
            return {
                status: "error",
                message: "You account has been banned from this channel until " + getRelativeDate(channelInfo.stateActiveUntil),
                data: {
                    channelId: data.channelId,
                    username: client.data.username,
                    state: channelInfo.state as eSubscriptionState,
                    stateActiveUntil: channelInfo.stateActiveUntil as Date,
                },
            } as join_channel_output;
        }
        client.join(data.channelId);
        let subs = null;
        try {
            subs = await this.prismaService.subscription.findMany({ where: { channelId: data.channelId } });
            // console.log(subs);
        } catch (e) {
            return {
                status: "error",
                message: e?.message,
                data: { channelId: data.channelId, username: client.data.username },
            } as join_channel_output;
        }
        return {
            status: "OK",
            message: null,
            data: {
                channelId: channelInfo.channel.id as string,
                name: channelInfo.channel.name as string,
                channel_type: channelInfo.channel.channel_type as eChannelType,
                messages: channelInfo.channel.messages as Message[],
                role: channelInfo.role as eRole,
                SubscribedUsers: subs as Subscription[],
                state: channelInfo.state as string,
                stateActiveUntil: channelInfo.stateActiveUntil as Date,
                password_protected: (channelInfo.channel.hash ? true : false) as boolean,
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
            channelInfo = await this.prismaService.getSubscriptionAndChannel(data.channelId, client.data.username);
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
        }
        // banned ?
        if (channelInfo.state == eSubscriptionState.BANNED) {
            return {
                status: "UNAUTHORIZED" as MessageStatus,
                channelId: data.channelId,
                comment: "what are you doing here ? you're banned ! get out of here now !",
            } as Message_Aknowledgement_output;
        }
        // muted
        if (channelInfo.state == eSubscriptionState.MUTED) {
            return {
                status: "UNAUTHORIZED" as MessageStatus,
                channelId: data.channelId,
                comment: "You account has been muted from this channel until " + getRelativeDate(channelInfo.stateActiveUntil),
            } as Message_Aknowledgement_output;
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

    async createChannel(username: string, channelCreationDto: ChannelCreationDto) {
        console.log(channelCreationDto);
        let hashedPassword = "";
        if (channelCreationDto?.password) hashedPassword = await bcrypt.hash(channelCreationDto.password, 10);
        let userArray: any[] = [{ username: username, role: eRole.OWNER }];
        // userArray.push({ username: username, role: eRole.OWNER });
        if (channelCreationDto.channel_type === eChannelType.PRIVATE) {
            channelCreationDto?.usernames.forEach((user) => {
                userArray.push({ username: user.username, role: eRole.USER });
            });
        } else if (channelCreationDto.channel_type === eChannelType.PUBLIC) {
            const allUsers = await this.prismaService.getAllUsernames(username);
            allUsers.forEach((user) => {
                userArray.push({ username: user.username, role: eRole.USER });
            });
        } else {
            throw new BadRequestException(["Invalid channel payload"]);
        }
        return await this.prismaService.createChannel(username, channelCreationDto.name, channelCreationDto.channel_type, hashedPassword, userArray).catch((err) => {
            throw new BadRequestException(["Invalid channel payload, could not create channel"]);
        });
    }

    // async setUserStateFromChannel(channelId: string, userFrom: string, userTo: string, userStateDTO: userStateDTO) {
    //     await this.prismaService.setUserStateFromChannel(channelId, userFrom, userTo, UserStateDTO.stateTo, UserStateDTO.duration);
    // }
    async alterUserStateInChannel(channelId: string, initiator: string, target: string, userStateDTO: UserStateDTO, scheduled: Boolean = false): Promise<Subscription> {
        if (scheduled) {
        }
        console.log(channelId, initiator, target, userStateDTO);
        const infos_initiator = await this.getSubInfosWithChannelAndUsers(initiator, channelId);
        filterInferiorRole(infos_initiator.role, eRole.ADMIN);
        const infos_target = infos_initiator.channel.SubscribedUsers.find((x) => x.username === target);
        throwIfRoleIsInferiorOrEqualToTarget(infos_initiator.role, infos_target.role);
        let alteration: any = {};
        if (userStateDTO.stateTo === eSubscriptionState.OK) {
            alteration = { state: userStateDTO.stateTo, stateActiveUntil: null };
        } else {
            if (infos_target.state === eSubscriptionState.BANNED && userStateDTO.stateTo === eSubscriptionState.BANNED) throw new BadRequestException(["Cannot ban a banned user"]);
            const cdate = new Date();
            cdate.setTime(userStateDTO.duration * 60 * 1000 + new Date().getTime());
            alteration = { state: userStateDTO.stateTo, stateActiveUntil: cdate };
        }
        const alteredSubscription: Subscription = await this.prismaService.subscription
            .update({
                where: { id: infos_target.id },
                data: alteration,
            })
            .catch((e) => {
                throw new BadRequestException(["Prisma: Invalid sub payload, target must have left the channel"]);
            });
        // Broadcast alteredSubscription to all subscribers in channel if they are connected and joined
        this.server.in(channelId).emit("altered_subscription", alteredSubscription);
        if (alteredSubscription.state === eSubscriptionState.BANNED) this.socketMap.get(target)?.leave(channelId);
        const future_subscription: Subscription = { ...alteredSubscription };
        if (alteredSubscription.state !== eSubscriptionState.OK) this.addScheduledStateAlteration(alteredSubscription);
        return alteredSubscription;
    }

    private async getSubInfosWithChannelAndUsers(username: string, channelId: string): Promise<SubInfosWithChannelAndUsers> {
        const infos: SubInfosWithChannelAndUsers = await this.prismaService.getSubInfosWithChannelAndUsers(username, channelId).catch((e) => {
            console.log(e);
            throw new ForbiddenException(["User not subscribed to channel | Channel not found"]);
        });
        return infos;
    }

    addScheduledStateAlteration(altered_subscription: Subscription) {
        const now = Date.now();
        const action = async () => {
            return await this.scheduledSubscriptionAlteration(altered_subscription, now).catch((e) => {});
        };
        try {
            this.schedulerRegistry.deleteTimeout(altered_subscription.id);
        } catch (e) {}
        const time_in_milliseconds = altered_subscription.stateActiveUntil.getTime() - now;
        if (time_in_milliseconds > 500) {
            const timeout = setTimeout(action.bind(this), time_in_milliseconds);
            this.schedulerRegistry.addTimeout(altered_subscription.id, timeout);
        } else {
            action();
        }
    }

    //doit appliquer la transformation
    private async scheduledSubscriptionAlteration(altered_subscription: Subscription, createdAt: number = 0): Promise<void> {
        console.log("SCHEDULED ACTION: ", altered_subscription.username, " state set to OK");
        if (createdAt === 0) createdAt = Date.now();
        console.log(`elapsed time: ${(Date.now() - createdAt) / 1000}s`);
        const res = await this.prismaService.subscription.update({
            where: { id: altered_subscription.id },
            data: {
                state: eSubscriptionState.OK,
                stateActiveUntil: null,
            },
        });
        this.server.in(altered_subscription.channelId).emit("altered_subscription", res);
    }

    private async __resumeScheduleStateResets() {
        const altered_subscriptions: Subscription[] = await this.prismaService.subscription.findMany({
            where: {
                OR: [{ state: eSubscriptionState.BANNED }, { state: eSubscriptionState.MUTED }],
            },
        });
        console.log("altered_subscriptions: ", altered_subscriptions);
        altered_subscriptions.forEach((subscription) => {
            const time_in_milliseconds = new Date(subscription.stateActiveUntil).getTime() - Date.now();
            console.log(`time remaining: ${time_in_milliseconds / 1000}s`);
            if (time_in_milliseconds <= 1000) {
                this.prismaService.subscription
                    .update({
                        where: { id: subscription.id },
                        data: { state: eSubscriptionState.OK, stateActiveUntil: null },
                    })
                    .catch((e) => {});
            } else {
                this.addScheduledStateAlteration(subscription);
            }
        });
    }
}
