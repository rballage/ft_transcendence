import { Strategy } from "passport-local";
import { PassportStrategy } from "@nestjs/passport";
import { Injectable } from "@nestjs/common";
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
        console.log(username, password);
        const user = await this.AuthService.getAuthenticatedUser(username, password);
        return user;
    }
}
