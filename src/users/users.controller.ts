import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from '@prisma/client';

@Controller('users')
export class UsersController {
	constructor(private readonly usersService: UsersService) {}

	@Get(':name')
	async getUser(@Param('name') name: string): Promise<User> {
		return this.usersService.getUser(name);
	}
	@Get(':name/profile')
	async getProfile(@Param('name') name: string): Promise<any> {
		return this.usersService.getProfile(name);
	}
}
