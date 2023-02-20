import { BadRequestException, ForbiddenException, Injectable, Logger, UnauthorizedException } from "@nestjs/common";
import { PrismaService } from "src/prisma.service";
import { Server, Socket } from "socket.io";
import { JoinRequestDto, NewMessageDto, ReceivedJoinRequest, ReceivedLeaveRequest, ReceivedMessage } from "src/utils/dto/ws.input.dto";
import { join_channel_output, MessageStatus, Message_Aknowledgement_output, UserInfo } from "src/utils/types/ws.output.types";
import * as bcrypt from "bcrypt";

import { Channel, eChannelType, eRole, eSubscriptionState, Message, Subscription, User } from "@prisma/client";
import { ChannelSettingsDto, ChannelCreationDto, UsernameDto, UserStateDTO } from "src/utils/dto/users.dto";

import { getRelativeDate } from "src/utils/helpers/getRelativeDate";
import { SubInfosWithChannelAndUsers, SubInfosWithChannelAndUsersAndMessages, subQuery, whereUserIsInChannel } from "src/utils/types/chat.queries";
import { filterInferiorRole, throwIfRoleIsInferiorOrEqualToTarget } from "src/utils/helpers/roles-helper";
import { SchedulerRegistry } from "@nestjs/schedule";
import { UserWhole } from "src/utils/types/users.types";

@Injectable()
export class ChatService {
    public server: Server = null;
    public socketMap: Map<string, Socket> = null;
    private readonly logger = new Logger(ChatService.name);

    constructor(private readonly prismaService: PrismaService, private readonly schedulerRegistry: SchedulerRegistry) {
        setTimeout(() => {
            this.__resumeScheduleStateResets();
        }, 2000);
    }

    async fetchAllConnectedUsers(): Promise<void> {
        for (const e of this.socketMap.values()) {
            e?.emit("fetch_me");
        }
    }

    async joinChannelHttp(user: UserWhole, channelId: string, joinInfos: JoinRequestDto): Promise<join_channel_output> {
        const infos_user: SubInfosWithChannelAndUsersAndMessages = await this.getSubInfosWithChannelAndUsersAndMessages(user.username, channelId);
        if (!(await this.filterBadPassword(joinInfos.password, infos_user.channel.hash))) throw new UnauthorizedException([`wrong password`]);
        if (infos_user.state === eSubscriptionState.BANNED) {
            throw new UnauthorizedException([`You are ${infos_user.state} in this channel!`]);
        }
        const socket = this.socketMap.get(user.username);
        if (socket?.connected) {
            if (socket.data.current_channel) {
                socket.leave(socket.data.current_channel);
                socket.data.current_channel = null;
            }
            socket.join(channelId);
            socket.data.current_channel = channelId;
        } else throw new BadRequestException([`You are not connected via WS`]);
        return {
            channelId: infos_user.channel.id as string,
            name: infos_user.channel.name as string,
            channel_type: infos_user.channel.channel_type as eChannelType,
            messages: infos_user.channel.messages as Message[],
            role: infos_user.role as eRole,
            SubscribedUsers: infos_user.channel.SubscribedUsers as Subscription[],
            state: infos_user.state as string,
            stateActiveUntil: infos_user.stateActiveUntil as Date,
            password_protected: (infos_user.channel.hash ? true : false) as boolean,
        } as join_channel_output;
    }

    async leaveChannelHttp(username: string): Promise<void> {
        const socket = this.socketMap.get(username);
        if (socket?.connected) {
            if (socket.data.current_channel) {
                socket.leave(socket.data.current_channel);
                socket.data.current_channel = null;
            }
        }
    }

    async leaveChannel(client: Socket, data: ReceivedLeaveRequest): Promise<void> {
        this.logger.verbose(`${client.data.username} left channel: ${data.channelId}`);
        client.leave(data.channelId);
    }

    async filterBadPassword(password: string, hash: string): Promise<boolean> {
        if (!hash) return true;
        const hash_check = await bcrypt.compare(password, hash).catch(() => {
            throw new UnauthorizedException(["wrong password"]);
        });
        if (!hash_check) throw new UnauthorizedException(["wrong password"]);
        return hash_check;
    }

    sendPrivateMessageNotification(user: UserWhole, infos_user: SubInfosWithChannelAndUsers, message: Message): void {
        const friendUsername: string =
            infos_user.channel.SubscribedUsers[0].username === user.username ? infos_user.channel.SubscribedUsers[1].username : infos_user.channel.SubscribedUsers[0].username;
        this.socketMap.get(friendUsername)?.emit("notifmessage", {
            username: user.username,
            message: message.content,
        });
    }

    sendMessageToNotBlockedByIfConnected(user: UserWhole, channelId: string, message: Message): void {
        this.socketMap.forEach((entry) => {
            if (entry.connected && entry.rooms.has(channelId) && !user.blocking?.includes(entry.data.username)) {
                entry.emit("message", message);
            }
        });
    }

    async newMessage(user: UserWhole, channelId: string, messageDto: NewMessageDto): Promise<void> {
        const infos_user: SubInfosWithChannelAndUsers = await this.getSubInfosWithChannelAndUsers(user.username, channelId);
        if (!(await this.filterBadPassword(messageDto.password, infos_user.channel.hash))) throw new UnauthorizedException([`wrong password`]);
        if (infos_user.state === eSubscriptionState.BANNED || infos_user.state == eSubscriptionState.MUTED) {
            throw new UnauthorizedException([`You are ${infos_user.state} in this channel!`]);
        }
        const message: Message = await this.prismaService.createMessage(user.username, channelId, messageDto.content).catch((e) => {
            throw new BadRequestException([e.message]);
        });
        if (infos_user.channel.channel_type === eChannelType.ONE_TO_ONE) {
            this.sendPrivateMessageNotification(user, infos_user, message);
        }
        this.sendMessageToNotBlockedByIfConnected(user, channelId, message);
    }

    async createChannel(username: string, channelCreationDto: ChannelCreationDto): Promise<Channel> {
        let hashedPassword = "";
        if (channelCreationDto?.password) hashedPassword = await bcrypt.hash(channelCreationDto.password, 10);
        let userArray: any[] = [{ username: username, role: eRole.OWNER }];
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
            throw new BadRequestException(["Invalid channel payload, could not create channel", err.message]);
        });
    }

    async alterUserStateInChannel(channelId: string, initiator: string, target: string, userStateDTO: UserStateDTO, scheduled: Boolean = false): Promise<Subscription> {
        const infos_initiator: SubInfosWithChannelAndUsers = await this.getSubInfosWithChannelAndUsers(initiator, channelId);
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
                throw new BadRequestException(["Prisma: Invalid sub payload, target must have left the channel", e.message]);
            });
        this.server.in(channelId).emit("altered_subscription", alteredSubscription);
        if (alteredSubscription.state === eSubscriptionState.BANNED) {
            const target_socket = this.socketMap.get(target);
            target_socket?.leave(channelId);
            target_socket?.emit("fetch_me");
        }
        if (alteredSubscription.state !== eSubscriptionState.OK) this.addScheduledStateAlteration(alteredSubscription);
        return alteredSubscription;
    }

    private async getSubInfosWithChannelAndUsers(username: string, channelId: string): Promise<SubInfosWithChannelAndUsers> {
        const infos: SubInfosWithChannelAndUsers = await this.prismaService.getSubInfosWithChannelAndUsers(username, channelId).catch((e) => {
            throw new ForbiddenException(["User not subscribed to channel | Channel not found", e.message]);
        });
        return infos;
    }
    private async getSubInfosWithChannelAndUsersAndMessages(username: string, channelId: string): Promise<SubInfosWithChannelAndUsersAndMessages> {
        const infos: SubInfosWithChannelAndUsersAndMessages = await this.prismaService.getSubInfosWithChannelAndUsersAndMessages(username, channelId).catch((e) => {
            throw new ForbiddenException(["User not subscribed to channel | Channel not found", e.message]);
        });
        return infos;
    }

    addScheduledStateAlteration(altered_subscription: Subscription): void {
        const now = Date.now();
        const action = async () => {
            return await this.__scheduledSubscriptionAlteration(altered_subscription, now).catch((e) => {});
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
    private async __scheduledSubscriptionAlteration(altered_subscription: Subscription, createdAt: number = 0): Promise<void> {
        if (createdAt === 0) createdAt = Date.now();
        const res = await this.prismaService.subscription.update({
            where: { id: altered_subscription.id },
            data: {
                state: eSubscriptionState.OK,
                stateActiveUntil: null,
            },
        });
        this.server.in(altered_subscription.channelId).emit("altered_subscription", res);
        const target_socket = this.socketMap.get(altered_subscription.username);
        target_socket?.emit("fetch_me");
    }

    private async __resumeScheduleStateResets(): Promise<void> {
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

    async alterChannelSettings(channel_id: string, initiator: string, settings: ChannelSettingsDto): Promise<void> {
        let channel_changed: boolean = false;
        const infos_initiator: SubInfosWithChannelAndUsers = await this.getSubInfosWithChannelAndUsers(initiator, channel_id);
        filterInferiorRole(infos_initiator.role, eRole.OWNER);
        const existing_subscriptions: string[] = infos_initiator.channel.SubscribedUsers.map((sub) => sub.username);
        const subscription_to_remove: any[] = infos_initiator.channel.SubscribedUsers.filter((sub) => sub.username !== initiator && !settings.usernames.includes(sub.username));
        const subscription_to_add: string[] = settings.usernames.filter((sub) => !existing_subscriptions.includes(sub));
        if (infos_initiator.channel.channel_type === eChannelType.PRIVATE) {
            if (subscription_to_remove.length > 0) {
                await this.prismaService.subscription
                    .deleteMany({
                        where: {
                            OR: subscription_to_remove.map((sub) => {
                                return { id: sub.id, username: sub.username };
                            }),
                        },
                    })
                    .catch((err) => {
                        throw new BadRequestException(["Could not delete subscriptions", err.message]);
                    });
                channel_changed = true;
            }
            if (subscription_to_add.length > 0) {
                await this.prismaService.subscription
                    .createMany({
                        data: subscription_to_add.map((sub) => {
                            return {
                                channelId: channel_id,
                                username: sub,
                                role: eRole.USER,
                                state: eSubscriptionState.OK,
                                stateActiveUntil: null,
                            };
                        }),
                    })
                    .catch((err) => {
                        throw new BadRequestException(["Could not create subscriptions", err.message]);
                    });
                channel_changed = true;
            }
        }
        if (settings.change_password) {
            if (settings.password) {
                const hash_password = await bcrypt.hash(settings.password, 10);
                await this.prismaService.channel.update({ where: { id: channel_id }, data: { hash: hash_password } }).catch((err) => {
                    throw new BadRequestException(["Could not modify password", err.message]);
                });
            } else {
                await this.prismaService.channel.update({ where: { id: channel_id }, data: { hash: null } }).catch((err) => {
                    throw new BadRequestException(["Could not modify password", err.message]);
                });
            }
            channel_changed = true;
        }
        if (channel_changed) {
            const altered_subscriptions = await this.prismaService.subscription.findMany({ where: { channelId: channel_id } });
            this.notifyIfConnected(
                altered_subscriptions.map((sub) => sub.username),
                "feth_me",
                null
            );
        }
    }

    notifyIfConnected(usernames: string[], eventName: string, eventData: any): void {
        usernames.forEach((username) => {
            this.socketMap.get(username)?.emit(eventName, eventData);
        });
    }
}
