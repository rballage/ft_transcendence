
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
// import { AuthService } from './auth.service';
// import { User } from '@prisma/client';

import { ExtractJwt, Strategy } from 'passport-jwt';
// import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { UsersService } from '../../users/users.service';
import { ITokenPayload } from '../auths.interface';
import * as dotenv from 'dotenv';
dotenv.config();
 
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(private readonly userService: UsersService){
		super({
			secretOrKey: `${process.env.JWT_ACCESS_SECRET}`,
			jwtFromRequest: ExtractJwt.fromExtractors([(request: Request) => {
				return request?.cookies?.Authentication;
			}]),
		});
	}
 
  async validate(payload: ITokenPayload) {
	console.log(payload);
	const user = await this.userService.getUser(payload.username);
    return user;
  }
}
