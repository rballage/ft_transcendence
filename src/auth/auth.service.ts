import { BadRequestException, Injectable } from "@nestjs/common";
import { User } from "@prisma/client";
import { CreateUserDto } from "../utils/dto/users.dto";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { ITokenPayload } from "./auths.interface";
import * as dotenv from "dotenv";
import { PrismaService } from "src/prisma.service";
dotenv.config();

@Injectable()
export class AuthService {
    refresh_expiration_time: number;
    access_expiration_time: number;

    constructor(private readonly prismaService: PrismaService, private readonly jwtService: JwtService) {
        // /!\ minimum = 4 /!\
        this.refresh_expiration_time = 10000;
        // /!\ minimum = 3 /!\
        this.access_expiration_time = 600;
    }

    async register(userDto: CreateUserDto): Promise<User> {
        userDto.password = await this.hashPassword(userDto.password);
        try {
            const user = await this.prismaService.createUser(userDto);
            delete user.password;
            return user;
        } catch (error) {
            throw new BadRequestException(["user already exists"]);
        }
    }

    async getAuthenticatedUser(name: string, password: string) {
        try {
            const user = await this.prismaService.getUser(name);
            await this.checkPassword(user.password, password);
            delete user.password;
            return user;
        } catch (error) {
            throw new BadRequestException(["wrong crededentials"]);
        }
    }

    async removeRefreshToken(userId: string) {
        return await this.prismaService.deleteRefreshToken(userId);
    }

    async hashPassword(password: string): Promise<string> {
        const hash_password = await bcrypt.hash(password, 10);
        return hash_password;
    }

    async checkPassword(hash: string, password: string): Promise<void> {
        const res = await bcrypt.compare(password, hash);
        if (!res && password !== hash) {
            throw new BadRequestException(["wrong credentials"]);
        }
    }

    verifyToken(token: string) {
        const payload = this.jwtService.verify(token, {
            secret: `${process.env.JWT_ACCESS_SECRET}`,
        });
        return payload;
    }

    getCookieWithRefreshToken(username: string): { cookie: string; has_refresh: string; token: string } {
        const payload: ITokenPayload = { username };
        const token = this.jwtService.sign(payload, {
            secret: `${process.env.JWT_REFRESH_SECRET}`,
            expiresIn: `${this.refresh_expiration_time}s`,
        });
        const cookie = `Refresh=${token}; HttpOnly; Path=/api/auth/; Max-Age=${this.refresh_expiration_time}`;
        const has_refresh = `has_refresh=true; Path=/; Max-Age=${this.refresh_expiration_time - 2}`;

        return { cookie, has_refresh, token };
    }

    getCookieWithAccessToken(username: string): { cookie: string; has_access: string } {
        const payload: ITokenPayload = { username };
        // console.log(`${String(this.access_expiration_time) + 's'}`)
        const token = this.jwtService.sign(payload, {
            secret: `${process.env.JWT_ACCESS_SECRET}`,
            expiresIn: `${String(this.access_expiration_time) + "s"}`,
        });
        const cookie = `Authentication=${token}; HttpOnly; Path=/; Max-Age=${this.access_expiration_time}`;
        const has_access = `has_access=true; Path=/; Max-Age=${this.access_expiration_time - 2}`;
        return { cookie, has_access };
    }

    getCookieWithWsAuthToken(username: string): string {
        const payload: ITokenPayload = { username };
        const token = this.jwtService.sign(payload, {
            secret: `${process.env.JWT_ACCESS_SECRET}`,
            expiresIn: `${this.refresh_expiration_time}s`,
        });
        const cookie = `WsAuth=${token}; Path=/; Max-Age=${this.refresh_expiration_time}`;
        return cookie;
    }

    createToken(payload: ITokenPayload, secret: string, expirationTime: number): string {
        return this.jwtService.sign(payload, { secret: secret, expiresIn: expirationTime });
    }

    getCookieForLogOut() {
        return [
            "Authentication=; HttpOnly; Path=/; Max-Age=0",
            "Refresh=; HttpOnly; Path=/; Max-Age=0",
            "WsAuth=; Path=/; Max-Age=0",
            "has_access=; Path=/; Max-Age=0",
            "has_refresh=; Path=/; Max-Age=0",
        ];
    }

    async getUserIfRefreshTokenMatches(refreshToken: string, name: string): Promise<User> {
        try {
            const user = await this.prismaService.getUser(name);
            if (refreshToken && user?.refresh_token) {
                const res = await bcrypt.compare(refreshToken, user.refresh_token);
                if (res) {
                    return user;
                }
            }
        } catch (error) {
            throw new BadRequestException(["user not found or bad refresh token"]);
        }
    }

    async generateNewTokens(username: string): Promise<any> {
        const accessTokenCookie = this.getCookieWithAccessToken(username);
        const WsAuthTokenCookie = this.getCookieWithWsAuthToken(username);
        const refreshTokenAndCookie = this.getCookieWithRefreshToken(username);
        await this.prismaService.setRefreshToken(refreshTokenAndCookie.token, username);
        return { accessTokenCookie, WsAuthTokenCookie, refreshTokenAndCookie };
    }
}
