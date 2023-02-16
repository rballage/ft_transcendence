import { Controller, Get, Patch, Param, UseGuards, Req, Query, HttpCode, Body, Res, Post } from "@nestjs/common";
import JwtAuthGuard from "../auth/guard/jwt-auth.guard";
import { UsersService } from "./users.service";
import { ParamUsernameDto, QueryGetGamesDto, QuerySearchUserDto, QueryToggle2FADto, updateUsernameDto } from "../utils/dto/users.dto";
import { IGames, UserProfile, UserWhole } from "../utils/types/users.types";
import { IRequestWithUser } from "../auth/auths.interface";
import { AuthService } from "src/auth/auth.service";
import { Response } from "express";

@UseGuards(JwtAuthGuard)
// @UseFilters(RedirectAuthFilter)
// @UseInterceptors(CacheInterceptor)
@Controller("users")
export class UsersController {
    constructor(private readonly usersService: UsersService, private readonly authService: AuthService) {}

    @Get("me")
    async getMe(@Req() request: IRequestWithUser): Promise<UserWhole> {
        return await this.usersService.getWholeUser(request.user.username);
    }

    @Get(":username/profile")
    async getProfile(@Param() usernameDto: ParamUsernameDto, @Req() request: IRequestWithUser): Promise<UserProfile> {
        if ((usernameDto.username as string) == "me") return await this.usersService.getProfile(request.user.username);
        return await this.usersService.getProfile(usernameDto.username);
    }

    @Get("me/games")
    async getGames(@Req() request: IRequestWithUser, @Query() query: QueryGetGamesDto): Promise<IGames> {
        return await this.usersService.getUserGames(request.user.username, query.skip, query.take, query.order);
    }

    @Get(":username/games")
    async getTargetGames(@Param() usernameDto: ParamUsernameDto, @Query() query: QueryGetGamesDto): Promise<IGames> {
        return await this.usersService.getUserGames(usernameDto.username, query.skip, query.take, query.order);
    }

    @Get("search")
    async searchUsers(@Req() request: IRequestWithUser, @Query() query: QuerySearchUserDto) {
        return await this.usersService.findUsers(request.user.username, query.key, query.skip, query.take);
    }
    @Patch(":username/follow")
    @HttpCode(205)
    async followUser(@Param() usernameDto: ParamUsernameDto, @Req() request: IRequestWithUser) {
        const user = await this.usersService.getWholeUser(request.user.username);
        return await this.usersService.followUser(user, usernameDto.username);
    }

    @Patch(":username/unfollow")
    @HttpCode(205)
    async unfollowUser(@Param() usernameDto: ParamUsernameDto, @Req() request: IRequestWithUser) {
        const user = await this.usersService.getWholeUser(request.user.username);
        return await this.usersService.unfollowUser(user, usernameDto.username);
    }

    @Patch(":username/block")
    @HttpCode(205)
    async blockUser(@Param() usernameDto: ParamUsernameDto, @Req() request: IRequestWithUser) {
        if (request.user.blocking.find((e) => e.blockingId === usernameDto.username))
          return await this.usersService.unblockUser(request.user, usernameDto.username);
        return await this.usersService.blockUser(request.user, usernameDto.username);
    }

    @Patch("2FA")
    @HttpCode(205)
    async toggle2FA(@Query() query: QueryToggle2FADto, @Req() request: IRequestWithUser) {
        return await this.usersService.toggle2FA(request.user, query.toggle);
    }

    @Patch("username")
    @HttpCode(205)
    async updateUsername(@Body() updateUsernameDto: updateUsernameDto, @Req() request: IRequestWithUser, @Res({ passthrough: true }) response: Response) {
        await this.usersService.updateUsername(request.user.username, updateUsernameDto.username);
        const { accessTokenCookie, WsAuthTokenCookie, refreshTokenAndCookie } = await this.authService.generateNewTokens(updateUsernameDto.username);
        response.setHeader("Set-Cookie", [accessTokenCookie.cookie, accessTokenCookie.has_access, refreshTokenAndCookie.cookie, refreshTokenAndCookie.has_refresh, WsAuthTokenCookie]);
    }
    @Get("")
    async getAllUsers(@Req() request: IRequestWithUser) {
        return await this.usersService.getAllUsers(request.user.username);
    }
}
