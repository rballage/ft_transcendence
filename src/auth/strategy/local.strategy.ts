import { Strategy } from "passport-local";
import { PassportStrategy } from "@nestjs/passport";
import { Injectable, UnauthorizedException } from "@nestjs/common";
import { AuthService } from "../auth.service";
import { User } from "@prisma/client";
import { WsService } from "src/ws/ws.service";
import { UserWhole } from "src/utils/types/users.types";

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy, "local") {
    constructor(private AuthService: AuthService) {
        super({
            usernameField: "username",
        });
    }

    async validate(username: string, password: string): Promise<UserWhole> {
        const user = await this.AuthService.getAuthenticatedUser(username, password);
        if (user.TwoFA) {
            const twoFAtoken = this.AuthService.generateTwoFAToken(user);
            throw new UnauthorizedException(["2fa needed", twoFAtoken]);
        }
        else if (user.password == "user42") {
            // const twoFAtoken = this.AuthService.generateTwoFAToken(user);
            throw new UnauthorizedException(["42 auth needed"]);
        }
        return user;
    }
}
