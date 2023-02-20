import { PassportStrategy } from "@nestjs/passport";
import { HttpException, Injectable } from "@nestjs/common";
// import { AuthService } from './auth.service';
// import { User } from '@prisma/client';

import { ExtractJwt, Strategy } from "passport-jwt";
// import { ConfigService } from '@nestjs/config';
import { Request } from "express";
import { ITokenPayload } from "../auths.interface";
import * as dotenv from "dotenv";
import { AuthService } from "../auth.service";
import { User } from "@prisma/client";
import { UserWhole } from "src/utils/types/users.types";
dotenv.config();

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, "jwt-refresh") {
    constructor(private readonly authService: AuthService) {
        super({
            secretOrKey: `${process.env.JWT_REFRESH_SECRET}`,
            passReqToCallback: true,
            jwtFromRequest: ExtractJwt.fromExtractors([
                (request: Request) => {
                    // console.log("refresh guard", request.cookies);
                    if (!request.cookies.Refresh) throw new HttpException("No Tokens, must login", 417);
                    return request?.cookies?.Refresh;
                },
            ]),
        });
    }

    async validate(request: Request, payload: ITokenPayload): Promise<UserWhole> {
        // console.log("PAYLOAD:", payload);

        // console.log("refresh guard validated");
        const refreshToken = request.cookies.Refresh;
        const u = await this.authService.getUserIfRefreshTokenMatches(refreshToken, payload.email);
        // console.log(u);
        return u as UserWhole;
    }
}
