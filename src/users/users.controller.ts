import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import JwtAuthGuard from '../auth/guard/jwt-auth.guard';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/users.dto';
import { UserProfile} from './types/users.types';
import { User } from '@prisma/client';
import { LocalAuthGuard } from 'src/auth/guard/local-auth.guard';

@Controller('users')
export class UsersController {
	constructor(private readonly usersService: UsersService) {}

	@UseGuards(JwtAuthGuard)
	@Get(':username')
	async getUser(@Param('username') username: string): Promise<User> {
		console.log('getUser', username);
		return await this.usersService.getUser(username);
	}
	@UseGuards(JwtAuthGuard)
	@Post('')
	async newUser(@Body() userDto: CreateUserDto): Promise<User> {
		return await this.usersService.createUser(userDto);
	}

	@UseGuards(JwtAuthGuard)
	@Get(':username/profile')
	async getProfile(@Param('username') username: string): Promise<UserProfile> {
		console.log('getProfile', username);

		return await this.usersService.getProfile(username);
	}
}
