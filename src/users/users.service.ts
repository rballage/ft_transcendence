import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { User } from "@prisma/client";
import { PrismaService } from "src/prisma.service";
import { CreateUserDto } from "../utils/dto/users.dto";
import { UserProfile, userProfileQuery, userWholeQuery, UserWhole, IGames } from "../utils/types/users.types";
import * as bcrypt from "bcrypt";
import { WsService } from "src/ws/ws.service";

@Injectable()
export class UsersService {
    constructor(private readonly prismaService: PrismaService, private readonly wsService: WsService) {}

    async createUser(userDto: CreateUserDto): Promise<User> {
        try {
            const user = await this.prismaService.user.create({ data: userDto });
            return user;
        } catch (error) {
            throw new BadRequestException("User already exists");
        }
    }

    async getUser(name: string): Promise<User> {
        try {
            const user = await this.prismaService.user.findUnique({ where: { username: name } });
            return user;
        } catch (error) {
            throw new NotFoundException("User not found");
        }
    }

    async getProfile(name: string): Promise<UserProfile> {
        const user = await this.prismaService.user.findUnique({
            where: { username: name },
            ...userProfileQuery,
        });
        if (!user) throw new NotFoundException("User not found");
        return user;
    }

    async getWholeUser(name: string): Promise<UserWhole> {
        const user = await this.prismaService.user.findUnique({
            where: { username: name },
            ...userWholeQuery,
        });
        return user;
    }

    async getUserGames(name: string, skipValue: number, takeValue: number, orderParam: any): Promise<IGames> {
        // https://github.com/prisma/prisma/issues/7550
        // orderParam = orderParam == 'asc' ? SortOrder.asc : SortOrder.desc;
        const queryObject = { where: { OR: [{ playerOneName: name }, { playerTwoName: name }] } };
        const games = await this.prismaService.game.findMany({
            ...queryObject,
            skip: skipValue,
            take: takeValue,
            orderBy: { finishedAt: orderParam },
        });
        const maxResults = await this.prismaService.game.count(queryObject);

        return { total: maxResults, result: games };
    }

    async findUsers(name: string, key: string, skipValue: number, takeValue: number) {
        const users = await this.prismaService.user.findMany({
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
        const maxResults = await this.prismaService.user.count({
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

    async followUser(stalker: UserWhole, target: string) {
        if (stalker.following.some((e) => e.followingId === target)) return;
        try {
            await this.prismaService.follows.create({
                data: {
                    followerId: stalker.username,
                    followingId: target,
                },
            });
        } catch (error) {
            throw new BadRequestException("User not found");
        }
    }
    async unfollowUser(stalker: UserWhole, target: string) {
        let res = stalker.following.find((e) => e.followingId === target);
        if (res !== undefined) {
            try {
                await this.prismaService.follows.delete({ where: { id: res.id } });
            } catch (error) {
                throw new BadRequestException("User not found");
            }
        }
    }
    async toggle2FA(user: User, value: boolean) {
        await this.prismaService.user.update({ where: { username: user.username }, data: { TwoFA: value } });
    }

    async setRefreshToken(refreshToken: string, name: string) {
        const HashedRefreshToken = await bcrypt.hash(refreshToken, 10);
        await this.prismaService.user.update({
            where: { username: name },
            data: { refresh_token: HashedRefreshToken },
        });
    }

    async addAvatar(username: string, path: string) {
        const res = await this.prismaService.user.update({
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

    async setNewPassword(newpassword: string, name: string) {
        const Hashednewpassword = await bcrypt.hash(newpassword, 10);
        await this.prismaService.user.update({
            where: { username: name },
            data: { password: Hashednewpassword },
        });
    }

    async deleteRefreshToken(name: string) {
        await this.prismaService.user.update({
            where: { username: name },
            data: { refresh_token: null },
        });
    }
}
