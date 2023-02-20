import { Controller, Get, Post, Body, UseGuards, HttpCode, Req, Res } from "@nestjs/common";
import { CreateUserDto } from "src/utils/dto/users.dto";
import { AuthService } from "./auth.service";

import { Response } from "express";
import { IRequestWithUser } from "./auths.interface";
import { LocalAuthGuard } from "./guard/local-auth.guard";
import JwtAuthGuard from "./guard/jwt-auth.guard";
import { JwtRefreshGuard } from "./guard/jwt-refresh-auth.guard";
import { UserWhole } from "src/utils/types/users.types";
import { PrismaService } from "src/prisma.service";
import { WsService } from "src/ws/ws.service";

@Controller("auth")
export class AuthController {
    constructor(private readonly prismaService: PrismaService, private readonly authService: AuthService, private readonly wsService: WsService) {}

    @HttpCode(201)
    @Post("signup")
    async newUser(@Body() userDto: CreateUserDto, @Res({ passthrough: true }) response: Response) {
        const user = await this.authService.register(userDto);
        const accessTokenCookie = this.authService.getCookieWithAccessToken(user.username);
        const WsAuthTokenCookie = this.authService.getCookieWithWsAuthToken(user.username);
        const refreshTokenAndCookie = this.authService.getCookieWithRefreshToken(user.username);
        await this.prismaService.setRefreshToken(refreshTokenAndCookie.token, user.username);
        response.setHeader("Set-Cookie", [accessTokenCookie.cookie, accessTokenCookie.has_access, refreshTokenAndCookie.cookie, refreshTokenAndCookie.has_refresh, WsAuthTokenCookie]);
        const userInfos: UserWhole = await this.prismaService.getWholeUser(user.username);
        // this.wsService.socketMap.get(user.username)?.disconnect();
        return userInfos;
    }

    @HttpCode(200)
    @UseGuards(JwtAuthGuard)
    @Get("")
    authenticate(@Req() request: IRequestWithUser, @Res({ passthrough: true }) response: Response) {
        return;
    }

    @HttpCode(200)
    @UseGuards(LocalAuthGuard)
    @Post("login")
    async logIn(@Req() request: IRequestWithUser, @Res({ passthrough: true }) response: Response) {
        const user = request.user;
        const userInfos: UserWhole = await this.prismaService.getWholeUser(request.user.username);
        this.wsService.socketMap.get(user.username)?.disconnect();
        const accessTokenCookie = this.authService.getCookieWithAccessToken(userInfos.email);
        const WsAuthTokenCookie = this.authService.getCookieWithWsAuthToken(userInfos.email);
        const refreshTokenAndCookie = this.authService.getCookieWithRefreshToken(userInfos.email);
        await this.prismaService.setRefreshToken(refreshTokenAndCookie.token, userInfos.email);
        response.setHeader("Set-Cookie", [accessTokenCookie.cookie, accessTokenCookie.has_access, refreshTokenAndCookie.cookie, refreshTokenAndCookie.has_refresh, WsAuthTokenCookie]);
        return userInfos;
    }

    @HttpCode(205)
    @UseGuards(JwtAuthGuard)
    @Get("logout")
    async logOut(@Req() request: IRequestWithUser, @Res({ passthrough: true }) response: Response) {
        console.log("LOGOUT");
        this.wsService.socketMap.get(request.user.username)?.disconnect();

        response.setHeader("Set-Cookie", this.authService.getCookieForLogOut());
        this.authService.removeRefreshToken(request.user.username);
        // Tells the client to reset the document which sent this request. ex: redirect to login/signup page, clear all user informations
        return;
    }

    @Get("clear-cookies")
    async clearCookies(@Res({ passthrough: true }) response: Response) {
        // console.log("clearCookies");
        response.setHeader("Set-Cookie", this.authService.getCookieForLogOut());
        return;
    }

    @HttpCode(204)
    @UseGuards(JwtRefreshGuard)
    @Get("refresh")
    refresh(@Req() request: IRequestWithUser, @Res({ passthrough: true }) response: Response) {
        // console.log("REFRESH", request.user.username);

        const WsAuthTokenCookie = this.authService.getCookieWithWsAuthToken(request.user.email);

        const accessTokenCookie = this.authService.getCookieWithAccessToken(request.user.email);
        response.setHeader("Set-Cookie", [accessTokenCookie.cookie, accessTokenCookie.has_access, WsAuthTokenCookie]);
        return;
    }
}
