
import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { AuthService } from './auth.service';
import { User } from '@prisma/client';

 
@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private AuthService: AuthService) {
    super({
      usernameField: 'username'
    });
  }

  async validate(name: string, password: string): Promise<User> {
	  const user = await this.AuthService.getAuthenticatedUser(name, password);
	  console.log('validating user ', user);
    return user;
  }
}