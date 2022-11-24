import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { User } from '@prisma/client';
import { CreateUserDto } from 'src/users/dto/users.dto';
import { AuthService } from './auth.service';
import { CreateAuthDto } from './dto/create-auth.dto';
import { UpdateAuthDto } from './dto/update-auth.dto';

@Controller('auth')
export class AuthController {
	constructor(private readonly authService: AuthService) {}

  	@Post('signup')
	async newUser(@Body() userDto: CreateUserDto): Promise<User> {
		return await this.authService.register(userDto);
	}

}
