import { Strategy } from "passport-local";
import { PassportStrategy } from "@nestjs/passport";
import { Injectable, UnauthorizedException } from "@nestjs/common";
import { AuthService } from "../auth.service";
import { User } from "@prisma/client";
import { WsService } from "src/ws/ws.service";

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy, "local") {
    constructor(private AuthService: AuthService, private readonly wsService: WsService) {
        super({
            usernameField: "username",
        });
    }

    async validate(username: string, password: string): Promise<User> {
        // if (this.wsService.isUserConnected(username)) throw new UnauthorizedException(["user is already connected"]);
        const user = await this.AuthService.getAuthenticatedUser(username, password);
        return user;
    }
}
