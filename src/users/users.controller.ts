import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req } from '@nestjs/common';
import JwtAuthGuard from '../auth/guard/jwt-auth.guard';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/users.dto';
import { UserProfile, UserWhole} from './types/users.types';
import { User } from '@prisma/client';
import { IRequestWithUser } from 'src/auth/auths.interface';


@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
	constructor(private readonly usersService: UsersService) {}

	@Get('me')
	async getMe(@Req() request: IRequestWithUser): Promise<UserWhole> {
		return await this.usersService.getWholeUser(request.user.username);
	}
	
	// @Get(':username')
	// async getUser(@Param('username') username: string): Promise<User> {
	// 	console.log('getUser', username);
	// 	return await this.usersService.getUser(username);
	// }

	@Post('')
	async newUser(@Body() userDto: CreateUserDto): Promise<User> {
		return await this.usersService.createUser(userDto);
	}

	@Get(':username/profile')
	async getProfile(@Param('username') username: string): Promise<UserProfile> {
		return await this.usersService.getProfile(username);
	}
}
