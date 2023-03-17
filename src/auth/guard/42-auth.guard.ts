import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
 
@Injectable()
export class AuthGuard42 extends AuthGuard('school42') {
    handleRequest(err:any, user:any, info: any) {
		console.log("|_______________________________________________________|")
		// You can throw an exception based on either "info" or "err" arguments
        if (info && info.message === "The resource owner or authorization server denied the request.")
            return "failure";
		//TODO switch 'failure' to a throw
		if (err || !user) {
		  throw err || new UnauthorizedException ();
		}
		return user;
	}

}