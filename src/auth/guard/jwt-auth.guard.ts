import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { AuthGuard, IAuthModuleOptions } from "@nestjs/passport";
import { Observable } from "rxjs";
// import * as

@Injectable()
export default class JwtAuthGuard extends AuthGuard("jwt") implements CanActivate {
    canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
        return super.canActivate(context);
    }

    handleRequest(err, user, info) {
        console.error("error", err);
        // console.log("user", user.username);
        // console.log("info", info);
        if (err || !user) {
            throw err || new UnauthorizedException();
        }
        return user;
    }
    // getAuthenticateOptions(context: ExecutionContext): any {
    //     const ctx = context.switchToHttp();
    //     console.log("ctx request", ctx.getRequest());
    //     console.log("ctx response", ctx.getResponse());
    // }

    // handleRequestError(error, _, response) {
    //     if (error instanceof UnauthorizedException) {
    //         response.redirect("/login");
    //     } else {
    //         super.handleRequestError(error, _, response);
    //     }
    // }
}
