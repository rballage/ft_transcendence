import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from '@prisma/client';

@Controller('users')
export class UsersController {
	constructor(private readonly usersService: UsersService) {}

	@Get(':username')
	async getUser(@Param('username') username: string): Promise<User> {
		return this.usersService.getUser(username);
	}
	@Post('')
	async newUser(@Body() userDto: CreateUserDto): Promise<User> {
		return this.usersService.createUser(userDto);
	}
	@Get(':username/profile')
	async getProfile(@Param('username') username: string): Promise<any> {
		return this.usersService.getProfile(username);
	}
}
