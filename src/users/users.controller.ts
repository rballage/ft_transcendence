import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req, Query, ParseIntPipe, BadRequestException, HttpCode, UseInterceptors, CacheInterceptor, UseFilters } from '@nestjs/common';
import JwtAuthGuard from '../auth/guard/jwt-auth.guard';
import { UsersService } from './users.service';
import { ParamUsernameDto, QueryGetGamesDto, QuerySearchUserDto, QueryToggle2FADto } from './dto/users.dto';
import { IGames, UserProfile, UserWhole} from './types/users.types';
import { IRequestWithUser } from '../auth/auths.interface';
import { RedirectAuthFilter } from 'src/common/filters/redirection.filter';


@UseGuards(JwtAuthGuard)
// @UseFilters(RedirectAuthFilter)
// @UseInterceptors(CacheInterceptor)
@Controller('users')
export class UsersController {
	constructor(private readonly usersService: UsersService) {}

	@Get('me')
	async getMe(@Req() request: IRequestWithUser): Promise<UserWhole> {
		return await this.usersService.getWholeUser(request.user.username);
	}

	@Get(':username/profile')
	async getProfile(@Param() usernameDto: ParamUsernameDto, @Req() request: IRequestWithUser): Promise<UserProfile> {
		if (usernameDto.username as string == 'me')
		    return await this.usersService.getProfile(request.user.username);
		return await this.usersService.getProfile(usernameDto.username);
	}

	@Get('me/games')
	async getGames(@Req() request: IRequestWithUser,
		@Query() query: QueryGetGamesDto) : Promise<IGames> {
		return await this.usersService.getUserGames(request.user.username, query.skip, query.take, query.order);
	}

	@Get(':username/games')
	async getTargetGames(@Param() usernameDto: ParamUsernameDto,
		@Query() query: QueryGetGamesDto) : Promise<IGames> {
		return await this.usersService.getUserGames(usernameDto.username, query.skip, query.take, query.order);
	}

	@Get('search')
	async searchUsers(@Req() request: IRequestWithUser,
		@Query() query: QuerySearchUserDto) {
		return await this.usersService.findUsers(request.user.username, query.key, query.skip, query.take);
	}
	@Patch(':username/follow')
	@HttpCode(205)
	async followUser(@Param() usernameDto: ParamUsernameDto, @Req() request: IRequestWithUser) {
		const user = await this.usersService.getWholeUser(request.user.username);
		return await this.usersService.followUser(user, usernameDto.username);
	}

	@Patch(':username/unfollow')
	@HttpCode(205)
	async unfollowUser(@Param() usernameDto: ParamUsernameDto, @Req() request: IRequestWithUser) {
		const user = await this.usersService.getWholeUser(request.user.username);
		return await this.usersService.unfollowUser(user, usernameDto.username);
	}
	
	@Patch('2FA')
	@HttpCode(205)
	async toggle2FA(@Query() query: QueryToggle2FADto, @Req() request: IRequestWithUser) {
		return await this.usersService.toggle2FA(request.user, query.toggle);
	}

}