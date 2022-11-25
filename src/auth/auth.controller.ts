import { Controller, Get, Post, Body, UseGuards, HttpCode, Req, Res } from '@nestjs/common';
import { User } from '@prisma/client';
import { CreateUserDto } from 'src/users/dto/users.dto';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guard/local-auth.guard';

import { Request, Response } from 'express';
import { IRequestWithUser } from './auths.interface';
import JwtAuthGuard from './guard/jwt-auth.guard';


 

@Controller('auth')
export class AuthController {
	constructor(private readonly authService: AuthService) {}

	@UseGuards(JwtAuthGuard)
  	@Get('')
  	authenticate(@Req() request: IRequestWithUser) {
    	const user = request.user;
    	delete user.password;
    	return user;
  	}

  	@Post('signup')
	async newUser(@Body() userDto: CreateUserDto): Promise<User> {
		return await this.authService.register(userDto);
	}

	@HttpCode(200)
	@Post('login')
	@UseGuards(LocalAuthGuard)
  	async logIn(@Req() request: IRequestWithUser, @Res() response: Response) {
		const user = request.user;
    	delete user.password;
  		const cookie = this.authService.getCookieWithJwtToken(user.username);
		console.log("cookie: ",cookie);
  		response.setHeader('Set-Cookie', cookie);
    	return response.send(user);
  	}

	@UseGuards(JwtAuthGuard)
	@Post('logout')
	async logOut(@Req() request: IRequestWithUser, @Res() response: Response) {
		response.setHeader('Set-Cookie', this.authService.getCookieForLogOut());
		// Tells the client to reset the document which sent this request. ex: redirect to login/signup page, clear all user informations
		return response.sendStatus(205); 
	}
}
