import { Controller, Get, Post, Body, UseGuards, HttpCode, Req, Res } from "@nestjs/common";
import { User } from "@prisma/client";
import { CreateUserDto } from "src/users/dto/users.dto";
import { AuthService } from "./auth.service";

import { Request, Response } from "express";
import { IRequestWithUser } from "./auths.interface";
import { UsersService } from "src/users/users.service";
import { LocalAuthGuard } from "./guard/local-auth.guard";
import JwtAuthGuard from "./guard/jwt-auth.guard";
import { JwtRefreshGuard } from "./guard/jwt-refresh-auth.guard";
import { UserWhole } from "src/users/types/users.types";

@Controller("auth")
export class AuthController {
    constructor(private readonly authService: AuthService, private readonly usersService: UsersService) {}

    @HttpCode(201)
    @Post("signup")
    async newUser(@Body() userDto: CreateUserDto, @Res({ passthrough: true }) response: Response) {
        const user = await this.authService.register(userDto);
        const accessTokenCookie = this.authService.getCookieWithAccessToken(user.username);
        const WsAuthTokenCookie = this.authService.getCookieWithWsAuthToken(user.username);
        const refreshTokenAndCookie = this.authService.getCookieWithRefreshToken(user.username);
        await this.usersService.setRefreshToken(refreshTokenAndCookie.token, user.username);
        response.setHeader("Set-Cookie", [
            accessTokenCookie.cookie,
            accessTokenCookie.has_access,
            refreshTokenAndCookie.cookie,
            refreshTokenAndCookie.has_refresh,
            WsAuthTokenCookie,
        ]);
        const userInfos: UserWhole = await this.usersService.getWholeUser(user.username);
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
        const accessTokenCookie = this.authService.getCookieWithAccessToken(user.username);
        const WsAuthTokenCookie = this.authService.getCookieWithWsAuthToken(user.username);
        const refreshTokenAndCookie = this.authService.getCookieWithRefreshToken(user.username);
        await this.usersService.setRefreshToken(refreshTokenAndCookie.token, user.username);
        response.setHeader("Set-Cookie", [
            accessTokenCookie.cookie,
            accessTokenCookie.has_access,
            refreshTokenAndCookie.cookie,
            refreshTokenAndCookie.has_refresh,
            WsAuthTokenCookie,
        ]);
        const userInfos: UserWhole = await this.usersService.getWholeUser(request.user.username);
        return userInfos;
    }

    @HttpCode(205)
    @UseGuards(JwtRefreshGuard)
    @Get("logout")
    async logOut(@Req() request: IRequestWithUser, @Res({ passthrough: true }) response: Response) {
        response.setHeader("Set-Cookie", this.authService.getCookieForLogOut());
        this.authService.removeRefreshToken(request.user.username);
        // Tells the client to reset the document which sent this request. ex: redirect to login/signup page, clear all user informations
        return;
    }

    @HttpCode(204)
    @UseGuards(JwtRefreshGuard)
    @Get("refresh")
    refresh(@Req() request: IRequestWithUser, @Res({ passthrough: true }) response: Response) {
        const WsAuthTokenCookie = this.authService.getCookieWithWsAuthToken(request.user.username);

        const accessTokenCookie = this.authService.getCookieWithAccessToken(request.user.username);
        response.setHeader("Set-Cookie", [accessTokenCookie.cookie, accessTokenCookie.has_access, WsAuthTokenCookie]);
        return;
    }
}
