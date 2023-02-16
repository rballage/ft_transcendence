import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { User } from "@prisma/client";
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
        infos.channelSubscriptions.forEach((sub) => {
            if (sub.channel.hash) {
                sub.channel.hash = "yes";
            } else {
                sub.channel.hash = "no";
            }
            return sub;
        });
        // console.log(infos.channelSubscriptions);
        // infos.channel.forEach(element => {

        // });
        return infos;
    }

    async getUserGames(name: string, skipValue: number, takeValue: number, orderParam: any): Promise<IGames> {
        return await this.prismaService.getUserGames(name, skipValue, takeValue, orderParam);
    }

    async findUsers(name: string, key: string, skipValue: number, takeValue: number) {
        return await this.prismaService.findUsers(name, key, skipValue, takeValue);
    }

    async followUser(stalker: UserWhole, target: string) {
        // FETCH_ME
        if (stalker.following.some((e) => e.followingId === target)) return;
        try {
            await this.prismaService.followUser(stalker, target);
            const targetUserEntry = await this.prismaService.getWholeUser(target);
            if (targetUserEntry.following.some((e) => e.followingId === stalker.username)) {
                const channel = await this.prismaService.createOneToOneChannel(stalker.username, target);
                console.log(channel);
            }
            this.wsService.followAnnouncement(stalker.username, target);
        } catch (error) {
            throw new BadRequestException("User not found");
        }
    }
    async unfollowUser(stalker: UserWhole, target: string) {
        // FETCH_ME
        let res = stalker.following.find((e) => e.followingId === target);
        if (res !== undefined) {
            try {
                await this.prismaService.unfollowUser(res.id);
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
        return await this.prismaService.updateUsername(username, alias).catch((error) => {
            throw new BadRequestException(["Username must be unique"]);
        });
    }
    async getAllUsers(username: string) {
        const users = await this.prismaService.getAllUsernames(username);
        return users;
    }
}
