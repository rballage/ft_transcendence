import { BadRequestException, CACHE_MANAGER, Inject, Injectable } from "@nestjs/common";
import { User } from "@prisma/client";
import { CreateUserDto } from "../utils/dto/users.dto";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { ITokenPayload, ITwoFATokenPayload } from "./auths.interface";
import * as dotenv from "dotenv";
import { PrismaService } from "src/prisma.service";
import { UserWhole } from "src/utils/types/users.types";
import { Cache } from "cache-manager";
import { authenticator } from "otplib";
import * as qrcode from "qrcode";
import { Response } from "express";
dotenv.config();

@Injectable()
export class AuthService {
    refresh_expiration_time: number;
    access_expiration_time: number;
    authenticator: typeof authenticator;

    constructor(private readonly prismaService: PrismaService, private readonly jwtService: JwtService, @Inject(CACHE_MANAGER) private cacheManager: Cache) {
        // /!\ minimum = 4 /!\
        this.refresh_expiration_time = 600400;
        // /!\ minimum = 3 /!\
        this.access_expiration_time = 1200;
        this.authenticator = authenticator;
        this.authenticator.options = { step: 30 };
    }
    // public async cache_SetUserToken(user: UserWhole, token: string) {
    //     await this.cacheManager.set(user.email, token, this.access_expiration_time * 1000);
    // }
    // public async cache_DeleteUserToken(user: UserWhole) {
    //     await this.cacheManager.del(user.email);
    // }
    // public async cache_GetUserToken(user: UserWhole) {
    //     return await this.cacheManager.get(user.email);
    // }

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
            const user = await this.prismaService.getWholeUser(name);
            await this.checkPassword(user.password, password);
            return user;
        } catch (error) {
            throw new BadRequestException(["wrong crededentials"]);
        }
    }
    async register42User(id42: string, userDto: CreateUserDto): Promise<User> {
        userDto.password = await this.hashPassword(userDto.password);
        try {
            const user = await this.prismaService.createUser(userDto);
            delete user.password;
            return user;
        } catch (error) {
            throw new BadRequestException(["user already exists"]);
        }
    }

    async get42AuthenticatedUser(id42: string, name: string, password: string) {
        try {
            const user = await this.prismaService.getUser(name);
            await this.checkPassword(user.password, password);
            delete user.password;
            return user;
        } catch (error) {
            throw new BadRequestException(["wrong crededentials"]);
        }
    }

    async removeRefreshToken(username: string) {
        return await this.prismaService.deleteRefreshToken(username);
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
    verify2faToken(token: string): ITwoFATokenPayload {
        const payload = this.jwtService.verify(token, {
            secret: `${process.env.JWT_ACCESS_SECRET}`,
        });
        return payload;
    }

    getCookieWithRefreshToken(user: UserWhole, TwoFAAuthenticated: boolean = false): { cookie: string; has_refresh: string; token: string } {
        const payload: ITokenPayload = { email: user.email, TwoFA: user.TwoFA, TwoFAAuthenticated, auth42: user.auth42, auth42Id: user.auth42Id };
        const token = this.jwtService.sign(payload, {
            secret: `${process.env.JWT_REFRESH_SECRET}`,
            expiresIn: `${String(this.refresh_expiration_time) + "s"}`,
        });
        const cookie = `Refresh=${token}; HttpOnly; Path=/; Max-Age=${this.refresh_expiration_time}`;
        const has_refresh = `has_refresh=true; Path=/; Max-Age=${this.refresh_expiration_time - 2}`;

        return { cookie, has_refresh, token };
    }

    async getCookieWithAccessToken(user: UserWhole, TwoFAAuthenticated: boolean = false): Promise<{ cookie: string; has_access: string }> {
        const payload: ITokenPayload = { email: user.email, TwoFA: user.TwoFA, TwoFAAuthenticated, auth42: user.auth42, auth42Id: user.auth42Id };
        // console.log(`${String(this.access_expiration_time) + 's'}`)
        const token = this.jwtService.sign(payload, {
            secret: `${process.env.JWT_ACCESS_SECRET}`,
            expiresIn: `${String(this.access_expiration_time) + "s"}`,
        });
        const cookie = `Authentication=${token}; HttpOnly; Path=/; Max-Age=${this.access_expiration_time}`;
        const has_access = `has_access=true; Path=/; Max-Age=${this.access_expiration_time - 2}`;
        return { cookie, has_access };
    }

    getCookieWithWsAuthToken(user: UserWhole, TwoFAAuthenticated: boolean = false): string {
        const payload: ITokenPayload = { email: user.email, TwoFA: user.TwoFA, TwoFAAuthenticated, auth42: user.auth42, auth42Id: user.auth42Id };
        const token = this.jwtService.sign(payload, {
            secret: `${process.env.JWT_ACCESS_SECRET}`,
            expiresIn: `${String(this.refresh_expiration_time) + "s"}`,
        });
        const cookie = `WsAuth=${token}; Path=/; Max-Age=${this.refresh_expiration_time}`;
        return cookie;
    }

    async getUserIfRefreshTokenMatches(refreshToken: string, u: UserWhole): Promise<UserWhole> {
        try {
            const user = await this.prismaService.getWholeUserByEmail(u.email);
            if (refreshToken && user?.refresh_token && user?.refresh_token === refreshToken) {
                return user;
            }
            console.log("DELETING REFRESH TOKEN");
            await this.prismaService.deleteRefreshToken(user.username);
            throw new Error("error");
        } catch (error) {
            // console.log(error);
            throw new Error(error.message);
        }
    }

    async generateNewTokens(user: UserWhole): Promise<any> {
        const accessTokenCookie = this.getCookieWithAccessToken(user);
        const WsAuthTokenCookie = this.getCookieWithWsAuthToken(user);
        const refreshTokenAndCookie = this.getCookieWithRefreshToken(user);
        await this.prismaService.setRefreshToken(refreshTokenAndCookie.token, user.email);
        return { accessTokenCookie, WsAuthTokenCookie, refreshTokenAndCookie };
    }

    getQRCodeUrl(user: UserWhole): string | undefined {
        // console.log(authenticator.allOptions);
        const emailEncoded = encodeURIComponent(user.email);
        if (user.TwoFASecret) return this.authenticator.keyuri(emailEncoded, `${process.env.TWO_FACTOR_AUTHENTICATION_APP_NAME}`, user.TwoFASecret);
        return undefined;
    }

    async generate2FASecretAndURL(user: UserWhole): Promise<string> {
        let secret = "";
        if (!user.TwoFASecret) secret = this.authenticator.generateSecret();
        else secret = user.TwoFASecret;
        await this.prismaService.setTwoFASecret(secret, user.email);
        const URL = `otpauth://totp/ft_transcendence_app:${encodeURIComponent(user.email)}?secret=${secret}&period=30&digits=6&algorithm=SHA1&issuer=ft_transcendence_app`;
        return URL;
    }
    async pipeQrCodeStream(stream: Response, url: string): Promise<void> {
        stream.setHeader("content-type", "image/png");
        return await qrcode.toFileStream(stream, url);
    }
    is2FACodeValid(user: UserWhole, twoFACode: string): boolean {
        return this.authenticator.verify({
            token: twoFACode,
            secret: user.TwoFASecret,
        });
    }

    generateTwoFAToken(user: UserWhole): string {
        const payload: ITwoFATokenPayload = { email: user.email, auth42: user.auth42, auth42Id: user.auth42Id };
        const token = this.jwtService.sign(payload, {
            secret: `${process.env.JWT_ACCESS_SECRET}`,
            expiresIn: "360s",
        });
        return token;
    }
}
