import { PassportStrategy } from "@nestjs/passport";
import { HttpException, Injectable, UnauthorizedException } from "@nestjs/common";
// import { AuthService } from './auth.service';
// import { User } from '@prisma/client';

import { ExtractJwt, Strategy } from "passport-jwt";
// import { ConfigService } from '@nestjs/config';
import { Request, Response } from "express";
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
            jwtFromRequest: ExtractJwt.fromExtractors([
                (request: Request) => {
                    return request?.cookies?.Refresh;
                },
            ]),
            passReqToCallback: true,
        });
    }

    async validate(request: Request, payload: ITokenPayload): Promise<UserWhole> {
        const refreshToken = request.cookies.Refresh;
        const user = await this.prismaService.getWholeUserByEmail(payload.email);
        if (refreshToken && user?.refresh_token && user?.refresh_token === refreshToken) {
            return user;
        }
        // res.clearCookie("Authentication");
        // res.clearCookie("has_access");
        // res.clearCookie("Refresh");
        // res.clearCookie("has_refresh");
        // res.clearCookie("WsAuth");
        throw new UnauthorizedException(["invalid token"]);
    }
}
