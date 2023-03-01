import { PassportStrategy } from "@nestjs/passport";
import { HttpException, Injectable, UnauthorizedException } from "@nestjs/common";
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
import { WsService } from "src/ws/ws.service";
import { PrismaService } from "src/prisma.service";
dotenv.config();

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, "jwt-refresh") {
    constructor(private readonly authService: AuthService, private readonly wsService: WsService, private readonly prismaService: PrismaService) {
        super({
            secretOrKey: `${process.env.JWT_REFRESH_SECRET}`,
            passReqToCallback: true,
            jwtFromRequest: ExtractJwt.fromExtractors([
                (request: Request) => {
                    // console.log("refresh guard", request.cookies);
                    if (!request.cookies.Refresh) throw new HttpException("No Tokens, must login", 401);
                    return request?.cookies?.Refresh;
                },
            ]),
        });
    }

    async validate(request: Request, payload: ITokenPayload): Promise<UserWhole> {
        // console.log("PAYLOAD:", payload);

        // console.log("refresh guard validated");
        const refreshToken = request.cookies.Refresh;
        const u = await this.authService.getUserIfRefreshTokenMatches(refreshToken, payload.email).catch(async (e) => {
            this.prismaService
                .getUserByEmail(payload.email)
                .then((r) => this.wsService.forceDisconnectUser(r.username))
                .catch(async (e) => {});
            throw new HttpException("No Tokens, must login", 401);
        });
        return u;
    }
}
