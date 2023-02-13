import { Injectable, OnModuleInit, INestApplication, NotFoundException, BadRequestException } from "@nestjs/common";
import { Channel, eChannelType, eSubscriptionState, eRole, PrismaClient, User } from "@prisma/client";
import { ChannelCreationDto, CreateUserDto, updateUsernameDto } from "./utils/dto/users.dto";
import { IGames, UserProfile, userProfileQuery, UserWhole, userWholeQuery } from "./utils/types/users.types";
import * as bcrypt from "bcrypt";
import generateChannelCompoundName from "./utils/helpers/generateChannelCompoundName";
import { SubInfosWithChannelAndUsers, subQuery, whereUserIsInChannel } from "./utils/types/chat.queries";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
    async onModuleInit() {
        await this.$connect();
    }

    async enableShutdownHooks(app: INestApplication) {
        this.$on("beforeExit", async () => {
            await app.close();
        });
    }
    async getUser(name: string): Promise<User> {
        try {
            const user = await this.user.findUnique({ where: { username: name } });
            return user;
        } catch (error) {
            throw new NotFoundException("User not found");
        }
    }
    async createUser(userDto: CreateUserDto): Promise<User> {
        try {
            const user = await this.user.create({ data: { ...userDto, alias: userDto.username } });
            return user;
        } catch (error) {
            throw new BadRequestException("User already exists");
        }
    }

    async updateUsername(username: string, newAlias: string) {
        await this.user.update({ where: { username: username }, data: { username: newAlias } });
    }

    async deleteRefreshToken(name: string) {
        await this.user.update({
            where: { username: name },
            data: { refresh_token: null },
        });
    }
    async setRefreshToken(HashedRefreshToken: string, name: string) {
        await this.user.update({
            where: { username: name },
            data: { refresh_token: HashedRefreshToken },
        });
    }
    async toggle2FA(user: User, value: boolean) {
        await this.user.update({ where: { username: user.username }, data: { TwoFA: value } });
    }

    async setNewPassword(Hashednewpassword: string, name: string) {
        await this.user.update({
            where: { username: name },
            data: { password: Hashednewpassword },
        });
    }
    async addAvatar(username: string, path: string) {
        const res = await this.user.update({
            where: { username: username },
            data: {
                avatars: {
                    upsert: {
                        create: { linkOriginal: path } as any, // sorry theo
                        update: { linkOriginal: path } as any, // sorry theo
                    },
                },
            },
            include: { avatars: true },
        });
        return res.avatars;
    }
    async unfollowUser(followId: string) {
        return await this.follows.delete({ where: { id: followId } });
    }
    async followUser(stalker: UserWhole, target: string) {
        return await this.follows.create({
            data: {
                followerId: stalker.username,
                followingId: target,
            },
        });
    }

    async findUsers(name: string, key: string, skipValue: number, takeValue: number) {
        const users = await this.user.findMany({
            where: {
                NOT: [{ username: name }],
                username: {
                    startsWith: key,
                    mode: "insensitive",
                },
            },
            skip: skipValue,
            take: takeValue,
            select: { username: true },
            orderBy: { username: "desc" },
        });
        const maxResults = await this.user.count({
            where: {
                NOT: [{ username: name }],
                username: {
                    startsWith: key,
                    mode: "insensitive",
                },
            },
        });
        return { total: maxResults, result: users };
    }
    async getUserGames(name: string, skipValue: number, takeValue: number, orderParam: any): Promise<IGames> {
        const queryObject = { where: { OR: [{ playerOneName: name }, { playerTwoName: name }] } };
        const games = await this.game.findMany({
            ...queryObject,
            skip: skipValue,
            take: takeValue,
            orderBy: { finishedAt: orderParam },
        });
        const maxResults = await this.game.count(queryObject);

        return { total: maxResults, result: games };
    }

    async getWholeUser(name: string): Promise<UserWhole> {
        const user = await this.user.findUnique({
            where: { username: name },
            ...userWholeQuery,
        });
        return user;
    }

    async getProfile(name: string): Promise<UserProfile> {
        const user = await this.user.findUnique({
            where: { username: name },
            ...userProfileQuery,
        });
        if (!user) throw new NotFoundException("User not found");
        return user;
    }

    async createOneToOneChannel(userA: string, userB: string) {
        const userAEmail = await this.user.findUnique({ where: { username: userA }, select: { email: true } });
        const userBEmail = await this.user.findUnique({ where: { username: userB }, select: { email: true } });
        const compoud_channel_name = generateChannelCompoundName(userAEmail.email, userBEmail.email);
        if (!compoud_channel_name) throw new BadRequestException("invalid Compoud channel name");
        let channel: Channel = await this.channel.findUnique({
            where: { name: compoud_channel_name },
        });
        if (!channel) {
            channel = await this.channel.create({
                data: {
                    name: compoud_channel_name,
                    channel_type: eChannelType.ONE_TO_ONE,
                    SubscribedUsers: { createMany: { data: [{ username: userA }, { username: userB }] } },
                },
                include: {
                    SubscribedUsers: true,
                    messages: true,
                },
            });
        }
        console.log(channel);
        return channel;
    }
    async getAllUsernames(exception: string) {
        const usernames = await this.user.findMany({
            where: { NOT: [{ username: exception }] },
            select: { username: true },
        });
        return usernames;
    }

    async createChannel(user: string, channelName: string, type: eChannelType, hashedPassword: string, userArray: any[]) {
        const channel = await this.channel.create({
            data: {
                name: channelName,
                channel_type: type,
                SubscribedUsers: { createMany: { data: userArray } },
                hash: hashedPassword,
            },
            include: {
                SubscribedUsers: true,
                messages: true,
            },
        });
        console.log(channel);
        delete channel.hash;
        return channel;
    }

    async setUserStateFromChannel(channelId: string, userFrom: string, userTo: string, stateTo: eSubscriptionState, duration: number) {
        const isUserFromHasRights = await this.subscription.findFirst({
            where: { channelId: channelId, username: userFrom },
        });
        if (isUserFromHasRights.role == eRole.USER) throw new BadRequestException("user permission denied");

        const cdate = new Date();
        cdate.setTime(duration * 60 * 1000 + new Date().getTime());
        const sub = await this.subscription.findFirst({
            where: { channelId: channelId, username: userTo },
        });
        if (!sub) throw new BadRequestException("unable to find subscription");
        return await this.subscription.update({
            where: { id: sub.id },
            data: {
                state: stateTo,
                stateActiveUntil: cdate,
            },
        });
    }

    async getSubscriptionAndChannel(channelId: string, username: string) {
        return await this.subscription.findFirstOrThrow({
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
    async getSubInfosWithChannelAndUsers(username: string, channelId: string): Promise<SubInfosWithChannelAndUsers> {
        return this.subscription.findFirstOrThrow({ where: whereUserIsInChannel(username, channelId, eRole.USER), ...subQuery });
    }
}
