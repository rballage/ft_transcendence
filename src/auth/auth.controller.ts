import { Controller, Get, Post, Body, UseGuards, HttpCode, Req, Res, UseFilters } from "@nestjs/common";
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
import { AuthErrorFilter } from "src/utils/filters/redirection.filter";
import { clearCookies } from "src/utils/helpers/clearCookies";

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

    @HttpCode(200)
    @UseGuards(JwtAuthGuard)
    @UseFilters(AuthErrorFilter)
    @Get("")
    authenticate() {
        return;
    }

    @HttpCode(200)
    @UseGuards(LocalAuthGuard)
    @Post("login")
    async logIn(@Req() request: IRequestWithUser, @Res({ passthrough: true }) response: Response): Promise<UserWholeOutput> {
        await this.authService.removeRefreshToken(request.user.username);
        this.wsService.userSockets.emitToUser(request.user.username, "logout");

        let userInfos: UserWhole = await this.prismaService.getWholeUser(request.user.username);
        const accessTokenCookie = await this.authService.getCookieWithAccessToken(userInfos.email);
        const refreshTokenAndCookie = this.authService.getCookieWithRefreshToken(userInfos.email);
        await this.prismaService.setRefreshToken(refreshTokenAndCookie.token, userInfos.email);
        const WsAuthTokenCookie = this.authService.getCookieWithWsAuthToken(userInfos.email);
        response.setHeader("Set-Cookie", [accessTokenCookie.cookie, accessTokenCookie.has_access, refreshTokenAndCookie.cookie, refreshTokenAndCookie.has_refresh, WsAuthTokenCookie]);
        userInfos = await this.prismaService.getWholeUser(request.user.username);

        return toUserWholeOutput(userInfos);
    }

    @HttpCode(205)
    @UseGuards(JwtRefreshGuard)
    @UseFilters(AuthErrorFilter)
    @Get("logout")
    async logOut(@Req() request: IRequestWithUser, @Res({ passthrough: true }) response: Response) {
        // await this.authService.cache_DeleteUserToken(request.user.email).catch((error) => {});
        console.log(`logout ${this.wsService.userSockets.log(request.user.username)}`);
        clearCookies(response);
        await this.authService.removeRefreshToken(request.user.username);
        this.wsService.userSockets.emitToUser(request.user.username, "logout");
    }

    @Get("clear-cookies")
    async clearCookies(@Res({ passthrough: true }) response: Response) {
        response.setHeader("Set-Cookie", this.authService.getCookieForLogOut());
    }

    @HttpCode(204)
    @UseGuards(JwtRefreshGuard)
    @UseFilters(AuthErrorFilter)
    @Get("refresh")
    async refresh(@Req() request: IRequestWithUser, @Res({ passthrough: true }) response: Response) {
        const WsAuthTokenCookie = this.authService.getCookieWithWsAuthToken(request.user.email);
        const accessTokenCookie = await this.authService.getCookieWithAccessToken(request.user.email);
        response.setHeader("Set-Cookie", [accessTokenCookie.cookie, accessTokenCookie.has_access, WsAuthTokenCookie]);
    }
}
