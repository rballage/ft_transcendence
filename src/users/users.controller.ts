import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req, Query, ParseIntPipe, BadRequestException } from '@nestjs/common';
import JwtAuthGuard from '../auth/guard/jwt-auth.guard';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/users.dto';
import { UserProfile, UserWhole} from './types/users.types';
import { User } from '@prisma/client';
import { IRequestWithUser } from '../auth/auths.interface';


@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
	constructor(private readonly usersService: UsersService) {}

	@Get('me')
	async getMe(@Req() request: IRequestWithUser): Promise<UserWhole> {
		return await this.usersService.getWholeUser(request.user.username);
	}

	@Get(':username/profile')
	async getProfile(@Param('username') username: string): Promise<UserProfile> {
		return await this.usersService.getProfile(username);
	}

	@Get('me/games')
	async getGames(@Req() request: IRequestWithUser,
		@Query('skip') skip: string,
		@Query('take') take: string,
		@Query('order') orderParam: string) {
		return await this.usersService.getUserGames(request.user.username, parseInt(skip), parseInt(take), orderParam);
	}

	@Get(':username/games')
	async getTargetGames(@Param('username') username: string,
		@Query('skip') skip: string,
		@Query('take') take: string,
		@Query('order') orderParam: string) {
		return await this.usersService.getUserGames(username, parseInt(skip), parseInt(take), orderParam);
	}

	@Get('search')
	async searchUsers(@Req() request: IRequestWithUser,
		@Query('key') key: string,
		@Query('skip') skip: string,
		@Query('take') take: string) {
		return await this.usersService.findUsers(request.user.username, key, parseInt(skip), parseInt(take));
	}
	// @Get(':username')
	// async getUser(@Param('username') username: string): Promise<User> {
	// 	console.log('getUser', username);
	// 	return await this.usersService.getUser(username);
	// }

	// @Post('')
	// async newUser(@Body() userDto: CreateUserDto): Promise<User> {
	// 	return await this.usersService.createUser(userDto);
	// }
}