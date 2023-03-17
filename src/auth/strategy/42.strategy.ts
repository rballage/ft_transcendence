import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-oauth2';
import { AuthService } from '../auth.service';
// import { FortyTwoUser } from '../interfaces/42user.interface';

@Injectable()
export class FortyTwoStrategy extends PassportStrategy(Strategy, 'school42') {
  constructor(private readonly authService: AuthService) {

    super({
			authorizationURL: process.env.CLIENT_URI,
			tokenURL: "https://api.intra.42.fr/oauth/token",
			clientID: process.env.CLIENT_ID,
			clientSecret: process.env.CLIENT_SECRET,
			callbackURL: "http://localhost:3000/auth/42/callback",
			scope: 'public',
			proxy: true
		});
  }
  
  async validate(accessToken: string,
    refreshToken: string,
    profile: any): Promise<any> {
      console.log("salut");
      const {id, emails, username, photos } = profile
      const user = {
        sub: id,
        email: emails[0].value,
        username: username,
        picture: photos[0].value,
        accessToken,
        refreshToken,
      }
      return (user);
    }
}
