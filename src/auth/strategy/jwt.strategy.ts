import { PassportStrategy } from "@nestjs/passport";
import { HttpException, Injectable, UnauthorizedException } from "@nestjs/common";
import { ExtractJwt, Strategy } from "passport-jwt";
import { Request, Response } from "express";
import { ITokenPayload } from "../auths.interface";
import * as dotenv from "dotenv";
import { PrismaService } from "src/prisma.service";
import { AuthService } from "../auth.service";
import { UserWhole } from "src/utils/types/users.types";
dotenv.config();

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, "jwt") {
    constructor(private readonly prismaService: PrismaService, private readonly authService: AuthService) {
        super({
            secretOrKey: `${process.env.JWT_ACCESS_SECRET}`,
            jwtFromRequest: ExtractJwt.fromExtractors([
                (request: Request) => {
                    return request?.cookies?.Authentication;
                },
            ]),
            passReqToCallback: true,
        });
    }
    async validate(req: Request, payload: ITokenPayload): Promise<UserWhole> {
        const user = await this.prismaService.getWholeUserByEmail(payload.email);
        if (user?.refresh_token) return user;
        // res.clearCookie("Authentication");
        // res.clearCookie("has_access");
        // res.clearCookie("Refresh");
        // res.clearCookie("has_refresh");
        // res.clearCookie("WsAuth");
        throw new UnauthorizedException(["invalid token"]);
    }
}
