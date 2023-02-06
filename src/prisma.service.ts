import { Injectable, OnModuleInit, INestApplication, NotFoundException, BadRequestException } from "@nestjs/common";
import { Channel, eChannelType, PrismaClient, User } from "@prisma/client";
import { CreateUserDto, UpdateAliasDto } from "./utils/dto/users.dto";
import generateChannelCompoudName from "./utils/helpers/generateChannelCompoundName";
import { IGames, UserProfile, userProfileQuery, UserWhole, userWholeQuery } from "./utils/types/users.types";

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

    async updateAlias(username: string, newAlias: string) {
        this.user.update({ where: { username: username }, data: { alias: newAlias } });
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
        const compoud_channel_name = generateChannelCompoudName(userA, userB);
        if (!compoud_channel_name) throw new BadRequestException("invalid Compoud channel name");
        let channel: Channel = await this.channel.findUnique({
            where: { name: compoud_channel_name },
        });
        if (!channel) {
            channel = await this.channel.create({
                data: {
                    name: compoud_channel_name,
                    channel_type: "ONE_TO_ONE",
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
}
