import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { Message, User } from "@prisma/client";
import { PrismaService } from "src/prisma.service";
import { CreateUserDto } from "../utils/dto/users.dto";
import { UserProfile, UserWhole, IGames } from "../utils/types/users.types";
import * as bcrypt from "bcrypt";
import { WsService } from "src/ws/ws.service";

@Injectable()
export class UsersService {
    constructor(private readonly prismaService: PrismaService, private readonly wsService: WsService) {}

    async createUser(userDto: CreateUserDto): Promise<User> {
        try {
            const user = await this.prismaService.createUser(userDto);
            return user;
        } catch (error) {
            throw new BadRequestException("User already exists");
        }
    }

    async getUser(name: string): Promise<User> {
        try {
            const user = await this.prismaService.getUser(name);
            return user;
        } catch (error) {
            throw new NotFoundException("User not found");
        }
    }

    async getProfile(name: string): Promise<UserProfile> {
        return this.prismaService.getProfile(name);
    }

    async getWholeUser(name: string): Promise<UserWhole> {
        const infos: UserWhole = await this.prismaService.getWholeUser(name);
        // infos.channelSubscriptions.forEach((sub) => {
        //     sub.channel.messages.sort((a: Message, b: Message) => {
        //         return a.id - b.id;
        //     });
        // });
        return infos;
    }

    async getUserGames(name: string, skipValue: number, takeValue: number, orderParam: any): Promise<IGames> {
        return await this.prismaService.getUserGames(name, skipValue, takeValue, orderParam);
    }

    async findUsers(name: string, key: string, skipValue: number, takeValue: number) {
        return await this.prismaService.findUsers(name, key, skipValue, takeValue);
    }

    async followUser(stalker: UserWhole, target: string, notify: boolean = true) {
        if (stalker.following.some((e) => e.followingId === target)) return;
        try {
            const targetUserEntry = await this.prismaService.getWholeUser(target);
            if (targetUserEntry.blocking.some((e) => e.blockingId === stalker.username)) throw new UnauthorizedException("Unable to follow a person who blocked you");
            await this.prismaService.followUser(stalker, target);
            if (targetUserEntry.following.some((e) => e.followingId === stalker.username)) await this.prismaService.createOneToOneChannel(stalker.username, target);
            if (notify) this.wsService.notifyIfConnected([stalker.username, target], "fetch_me", null);
        } catch (error) {
            throw new BadRequestException("User not found");
        }
    }
    async unfollowUser(stalker: UserWhole, target: string, notify: boolean = true) {
        let res = stalker.following.find((e) => e.followingId === target);
        if (res !== undefined) {
            try {
                await this.prismaService.unfollowUser(res.id);
                if (notify) this.wsService.notifyIfConnected([stalker.username, target], "fetch_me", null);
            } catch (error) {
                throw new BadRequestException("User not found");
            }
        }
    }

    async blockUser(stalker: UserWhole, target: string) {
        if (stalker.blocking.some((e) => e.blockingId === target)) return;
        try {
            const targetObj = await this.getWholeUser(target);
            await this.prismaService.blockUser(stalker, targetObj.username);
            this.unfollowUser(stalker, target, false);
            this.unfollowUser(targetObj, stalker.username);
        } catch (error) {
            throw new BadRequestException("User not found");
        }
    }
    async unblockUser(stalker: UserWhole, target: string) {
        console.log(stalker.blocking);

        let res = stalker.blocking.find((e) => e.blockingId === target);
        console.log(res);
        if (res !== undefined) {
            try {
                await this.prismaService.unBlockUser(res.id);
                this.wsService.notifyIfConnected([stalker.username, target], "fetch_me", null);
            } catch (error) {
                throw new BadRequestException("User not found");
            }
        }
    }

    async toggle2FA(user: UserWhole, value: boolean) {
        await this.prismaService.toggle2FA(user.username, value);
    }

    async setRefreshToken(refreshToken: string, name: string) {
        const HashedRefreshToken = await bcrypt.hash(refreshToken, 10);
        await this.prismaService.setRefreshToken(HashedRefreshToken, name);
    }

    async addAvatar(username: string, path: string) {
        return await this.prismaService.addAvatar(username, path);
    }

    async setNewPassword(newpassword: string, name: string) {
        const Hashednewpassword = await bcrypt.hash(newpassword, 10);
        await this.prismaService.setNewPassword(Hashednewpassword, name);
    }
    async updateUsername(username: string, alias: string) {
        return await this.prismaService
            .updateUsername(username, alias)
            .then(() => {
                const socket = this.wsService.socketMap.get(username);
                if (socket?.connected) {
                    socket.data.username = alias;
                    this.wsService.socketMap.set(alias, socket);
                    this.wsService.socketMap.delete(username);
                }
                this.wsService.notifyIfConnected(Array.from(this.wsService.socketMap.keys()), "fetch_me", null);
            })
            .catch((error) => {
                throw new BadRequestException(["Username must be unique"]);
            });
    }
    async getAllUsers(username: string) {
        return await this.prismaService.getAllUsernames(username);
    }
}
