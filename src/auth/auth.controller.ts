import { Controller, Get, Post, Body, UseGuards, HttpCode, Req, Res, UseFilters, ForbiddenException, BadRequestException, Param, Query } from "@nestjs/common";
import { CreateUserDto } from "src/utils/dto/users.dto";
import { AuthService } from "./auth.service";

import { Response } from "express";
import { IRequestWithUser, ITwoFATokenPayload } from "./auths.interface";
import { LocalAuthGuard } from "./guard/local-auth.guard";
import JwtAuthGuard from "./guard/jwt-auth.guard";
import { AuthGuard42 } from "./guard/42-auth.guard";
import { JwtRefreshGuard } from "./guard/jwt-refresh-auth.guard";
import { UserWhole, UserWholeOutput } from "src/utils/types/users.types";
import { PrismaService } from "src/prisma.service";
import { WsService } from "src/ws/ws.service";
import { toUserWholeOutput } from "src/utils/helpers/output";
import { AuthErrorFilter } from "src/utils/filters/redirection.filter";
import { clearCookies } from "src/utils/helpers/clearCookies";
import { TwoFaAuthDto } from "src/utils/dto/create-auth.dto";
import axios from 'axios'

@Controller("auth")
export class AuthController {
    constructor(private readonly prismaService: PrismaService, private readonly authService: AuthService, private readonly wsService: WsService) {}

    @HttpCode(201)
    @Post("signup")
    async newUser(@Body() userDto: CreateUserDto, @Res({ passthrough: true }) response: Response): Promise<UserWholeOutput> {
        const user = await this.authService.register(userDto);
        const wholeUser = await this.prismaService.getWholeUserByEmail(user.email); // will I forgive Myself ?
        const accessTokenCookie = await this.authService.getCookieWithAccessToken(wholeUser);
        const WsAuthTokenCookie = this.authService.getCookieWithWsAuthToken(wholeUser);
        const refreshTokenAndCookie = this.authService.getCookieWithRefreshToken(wholeUser);
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
        const accessTokenCookie = await this.authService.getCookieWithAccessToken(userInfos);
        const refreshTokenAndCookie = this.authService.getCookieWithRefreshToken(userInfos);
        await this.prismaService.setRefreshToken(refreshTokenAndCookie.token, userInfos.email);
        const WsAuthTokenCookie = this.authService.getCookieWithWsAuthToken(userInfos);
        response.setHeader("Set-Cookie", [accessTokenCookie.cookie, accessTokenCookie.has_access, refreshTokenAndCookie.cookie, refreshTokenAndCookie.has_refresh, WsAuthTokenCookie]);
        userInfos = await this.prismaService.getWholeUser(request.user.username);

        return toUserWholeOutput(userInfos);
    }

    @HttpCode(201) 
    // @UseGuards(AuthGuard42)
    @Get('42/callback/:code')
    async callback42(
        @Param("code") code: string,
        @Res({ passthrough: true }) response: Response): Promise<any> {
            if (!code)
                throw new ForbiddenException(["wrong request"]);
        console.log("aled le code:", code)

        const payloadTo42 = {
            grant_type: "authorization_code", 
            client_id: process.env.CLIENT_ID,
            client_secret: process.env.CLIENT_SECRET,
            code: code,
            redirect_uri: process.env.REDIRECT_URI,
        }
        // console.log('caca1');
        const toto = await axios.post('https://api.intra.42.fr/oauth/token', payloadTo42)
        .catch(() => {
            console.log("nul")
            throw new ForbiddenException(["wrong credential or code"]);
        })

        const config = {
            headers:{
                "Access-Control-Allow-Origin": '*',
                Authorization: toto.data.token_type + ' ' + toto.data.access_token,
            }
          };

        const tata = await axios.get('https://api.intra.42.fr/v2/me', config)
        .catch(() => {
            console.log("nul 2")
            throw new ForbiddenException(["wrong 42 auth token"]);
        })
        // console.log(
        //     tata.data.login,
        //     tata.data.email)
            // ,
            // tata.data.image.link);
        // let userInfos: UserWhole = 
        try{
            let userInfos: UserWhole = await this.prismaService.getWholeUserByEmail(tata.data.email)
            if (userInfos.auth42 == false)
                throw  new ForbiddenException(["email already in use"]);
            await this.authService.removeRefreshToken(userInfos.username);
            this.wsService.userSockets.emitToUser(userInfos.username, "logout");
            const accessTokenCookie = await this.authService.getCookieWithAccessToken(userInfos);
            const refreshTokenAndCookie = this.authService.getCookieWithRefreshToken(userInfos);
            await this.prismaService.setRefreshToken(refreshTokenAndCookie.token, userInfos.email);
            const WsAuthTokenCookie = this.authService.getCookieWithWsAuthToken(userInfos);
            response.setHeader("Set-Cookie", [accessTokenCookie.cookie, accessTokenCookie.has_access, refreshTokenAndCookie.cookie, refreshTokenAndCookie.has_refresh, WsAuthTokenCookie]);
            userInfos = await this.prismaService.getWholeUser(userInfos.username);
            return toUserWholeOutput(userInfos);
        }
        catch (err) {
            if ( err.message == "email already in use")
                throw err
            let userDto = {
                username: tata.data.login,
                email: tata.data.email,
                password : "user42",
                auth42 : true,
                auth42Id: tata.data.id.toString(),
            }
            console.log("before chaos")
            try{
                let user_toto = null;
                do
                {
                user_toto = await this.prismaService.getWholeUser(userDto.username)
                userDto.username += Math.round(Math.random() * 10).toString()
                console.log(user_toto.username , userDto.username);
                } while (user_toto)
            }
            catch (err)
            {}
            const user = await this.prismaService.createUser(userDto);
            const wholeUser = await this.prismaService.getWholeUserByEmail(user.email);
            const accessTokenCookie = await this.authService.getCookieWithAccessToken(wholeUser);
            const WsAuthTokenCookie = this.authService.getCookieWithWsAuthToken(wholeUser);
            const refreshTokenAndCookie = this.authService.getCookieWithRefreshToken(wholeUser);
            await this.prismaService.setRefreshToken(refreshTokenAndCookie.token, user.email);
            response.setHeader("Set-Cookie", [accessTokenCookie.cookie, accessTokenCookie.has_access, refreshTokenAndCookie.cookie, refreshTokenAndCookie.has_refresh, WsAuthTokenCookie]);
            const userInfos: UserWhole = await this.prismaService.getWholeUser(user.username);
            console.log("user created: ", userInfos);
            // tata.data.image.link
            return toUserWholeOutput(userInfos);
        }
        // .catch(()=> {
        //     console.log("pas de user")
        // })
        // console.log(userInfos);
        // await this.prismaService.getWholeUser();
        

/*
curl -H "Authorization: Bearer YOUR_ACCESS_TOKEN" https://api.intra.42.fr/v2/me
*/

        // let userInfos: UserWhole = await this.prismaService.getWholeUser(request.user.username);
        // const accessTokenCookie = await this.authService.getCookieWithAccessToken(userInfos);
        // const refreshTokenAndCookie = this.authService.getCookieWithRefreshToken(userInfos);
        // await this.prismaService.setRefreshToken(refreshTokenAndCookie.token, userInfos.email);
        // const WsAuthTokenCookie = this.authService.getCookieWithWsAuthToken(userInfos);
        // response.setHeader("Set-Cookie", [accessTokenCookie.cookie, accessTokenCookie.has_access, refreshTokenAndCookie.cookie, refreshTokenAndCookie.has_refresh, WsAuthTokenCookie]);
        // userInfos = await this.prismaService.getWholeUser(request.user.username);

        // return toUserWholeOutput(userInfos
        return;
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
        clearCookies(response);
    }

    @HttpCode(204)
    @UseGuards(JwtRefreshGuard)
    @UseFilters(AuthErrorFilter)
    @Get("refresh")
    async refresh(@Req() request: IRequestWithUser, @Res({ passthrough: true }) response: Response) {
        const WsAuthTokenCookie = this.authService.getCookieWithWsAuthToken(request.user, request.user.TwoFA);
        const accessTokenCookie = await this.authService.getCookieWithAccessToken(request.user, request.user.TwoFA);
        response.setHeader("Set-Cookie", [accessTokenCookie.cookie, accessTokenCookie.has_access, WsAuthTokenCookie]);
    }
    @UseGuards(JwtRefreshGuard)
    @Get("2FA/generate")
    async generate(@Req() request: IRequestWithUser, @Res() response: Response) {
        const url: string = await this.authService.generate2FASecretAndURL(request.user);
        return this.authService.pipeQrCodeStream(response, url);
    }
    @UseGuards(JwtRefreshGuard)
    @Post("2FA/validate")
    async validate(@Req() request: IRequestWithUser, @Body() TwoFACode: TwoFaAuthDto, @Res({ passthrough: true }) response: Response) {
        const isCodeValid = this.authService.is2FACodeValid(request.user, TwoFACode.code);
        if (!isCodeValid) {
            throw new BadRequestException(["Wrong authentication code"]);
        }
        await this.prismaService.toggle2FA(request.user.email, true);
        // this.wsService.userSockets.emitToUser(request.user.username, "fetch_me");
        await this.setAllCookies(response, request.user.email, true);
        return true;
    }
    @UseGuards(JwtRefreshGuard)
    @Post("2FA/deactivate")
    async deactivate2fa(@Req() request: IRequestWithUser, @Res({ passthrough: true }) response: Response) {
        await this.prismaService.toggle2FA(request.user.email, false);
        await this.setAllCookies(response, request.user.email, false);
        return true;
    }
    // @UseGuards(jwt2FAAuthGuard)
    @Post("2FA/login")
    async login2fa(@Query("token") token: string, @Body() TwoFACode: TwoFaAuthDto, @Res({ passthrough: true }) response: Response) {
        console.log(token);
        const payload: ITwoFATokenPayload = this.authService.verify2faToken(token);
        const user: UserWhole = await this.prismaService.getWholeUserByEmail(payload.email);

        const isCodeValid = this.authService.is2FACodeValid(user, TwoFACode.code);
        if (!isCodeValid) {
            throw new BadRequestException(["Wrong authentication code"]);
        }
        await this.authService.removeRefreshToken(user.username);
        this.wsService.userSockets.emitToUser(user.username, "logout");
        await this.setAllCookies(response, user.email, true);
        const userInfos = await this.prismaService.getWholeUser(user.username);
        return toUserWholeOutput(userInfos);
    }

    private async setAllCookies(response: Response, email: string, is2fa: boolean = false): Promise<void> {
        const userInfos: UserWhole = await this.prismaService.getWholeUserByEmail(email);
        const accessTokenCookie = await this.authService.getCookieWithAccessToken(userInfos, is2fa);
        const refreshTokenAndCookie = this.authService.getCookieWithRefreshToken(userInfos, is2fa);
        await this.prismaService.setRefreshToken(refreshTokenAndCookie.token, userInfos.email);
        const WsAuthTokenCookie = this.authService.getCookieWithWsAuthToken(userInfos, is2fa);
        response.setHeader("Set-Cookie", [accessTokenCookie.cookie, accessTokenCookie.has_access, refreshTokenAndCookie.cookie, refreshTokenAndCookie.has_refresh, WsAuthTokenCookie]);
    }
}
