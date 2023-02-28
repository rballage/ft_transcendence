import { Controller, Get, Post, Body, UseGuards, HttpCode, Req, Res } from "@nestjs/common";
import { CreateUserDto } from "src/utils/dto/users.dto";
import { AuthService } from "./auth.service";

import { Response } from "express";
import { IRequestWithUser } from "./auths.interface";
import { LocalAuthGuard } from "./guard/local-auth.guard";
import JwtAuthGuard from "./guard/jwt-auth.guard";
import { JwtRefreshGuard } from "./guard/jwt-refresh-auth.guard";
import { UserWhole, UserWholeOutput } from "src/utils/types/users.types";
import { PrismaService } from "src/prisma.service";
import { WsService } from "src/ws/ws.service";
import { toUserWholeOutput } from "src/utils/helpers/output";

@Controller("auth")
export class AuthController {
    constructor(private readonly prismaService: PrismaService, private readonly authService: AuthService, private readonly wsService: WsService) {}

    @HttpCode(201)
    @Post("signup")
    async newUser(@Body() userDto: CreateUserDto, @Res({ passthrough: true }) response: Response): Promise<UserWholeOutput> {
        const user = await this.authService.register(userDto);
        const accessTokenCookie = await this.authService.getCookieWithAccessToken(user.email);
        const WsAuthTokenCookie = this.authService.getCookieWithWsAuthToken(user.email);
        const refreshTokenAndCookie = this.authService.getCookieWithRefreshToken(user.email);
        await this.prismaService.setRefreshToken(refreshTokenAndCookie.token, user.email);
        response.setHeader("Set-Cookie", [accessTokenCookie.cookie, accessTokenCookie.has_access, refreshTokenAndCookie.cookie, refreshTokenAndCookie.has_refresh, WsAuthTokenCookie]);
        const userInfos: UserWhole = await this.prismaService.getWholeUser(user.username);
        console.log("user created: ", userInfos);
        return toUserWholeOutput(userInfos);
    }

    // @HttpCode(200)
    // @UseGuards(JwtAuthGuard)
    // @Get("")
    // authenticate(@Res({ passthrough: true }) response: Response) {
    //     return;
    // }

    @HttpCode(200)
    @UseGuards(LocalAuthGuard)
    @Post("login")
    async logIn(@Req() request: IRequestWithUser, @Res({ passthrough: true }) response: Response): Promise<UserWholeOutput> {
        const user = request.user;
        let userInfos: UserWhole = await this.prismaService.getWholeUser(request.user.username);
        this.wsService.socketMap.get(user.username)?.disconnect();
        const accessTokenCookie = await this.authService.getCookieWithAccessToken(userInfos.email);
        const WsAuthTokenCookie = this.authService.getCookieWithWsAuthToken(userInfos.email);
        const refreshTokenAndCookie = this.authService.getCookieWithRefreshToken(userInfos.email);
        await this.prismaService.setRefreshToken(refreshTokenAndCookie.token, userInfos.email);
        response.setHeader("Set-Cookie", [accessTokenCookie.cookie, accessTokenCookie.has_access, refreshTokenAndCookie.cookie, refreshTokenAndCookie.has_refresh, WsAuthTokenCookie]);
        userInfos = await this.prismaService.getWholeUser(request.user.username);

        return toUserWholeOutput(userInfos);
    }

    @HttpCode(205)
    @UseGuards(JwtAuthGuard)
    @Get("logout")
    async logOut(@Req() request: IRequestWithUser, @Res({ passthrough: true }) response: Response) {
        this.wsService.socketMap.get(request.user.username)?.disconnect();
        response.setHeader("Set-Cookie", this.authService.getCookieForLogOut());
        await this.authService.cache_DeleteUserToken(request.user.email).catch((error) => {});
        this.authService.removeRefreshToken(request.user.username);
    }

    @Get("clear-cookies")
    async clearCookies(@Res({ passthrough: true }) response: Response) {
        response.setHeader("Set-Cookie", this.authService.getCookieForLogOut());
    }

    @HttpCode(204)
    @UseGuards(JwtRefreshGuard)
    @Get("refresh")
    async refresh(@Req() request: IRequestWithUser, @Res({ passthrough: true }) response: Response) {
        const WsAuthTokenCookie = this.authService.getCookieWithWsAuthToken(request.user.email);
        const accessTokenCookie = await this.authService.getCookieWithAccessToken(request.user.email);
        response.setHeader("Set-Cookie", [accessTokenCookie.cookie, accessTokenCookie.has_access, WsAuthTokenCookie]);
    }
}
