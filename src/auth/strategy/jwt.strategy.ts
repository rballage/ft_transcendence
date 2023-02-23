import { PassportStrategy } from "@nestjs/passport";
import { HttpException, Injectable, UnauthorizedException } from "@nestjs/common";
import { ExtractJwt, Strategy } from "passport-jwt";
import { Request } from "express";
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
                    // console.log("access guard", request.cookies);
                    if (!request?.cookies?.Authentication) throw new HttpException("No Tokens, must login", 417);

                    return request?.cookies?.Authentication;
                },
            ]),
            passReqToCallback: true,
            passResToCallback: true,
        });
    }
    async validate(req: Request, payload: ITokenPayload): Promise<UserWhole> {
        // console.log("access guard validate");
        // console.log("PAYLOAD:", payload, req.cookies.Authentication);
        const storedToken = await this.authService.cache_GetUserToken(payload.email).catch(() => {
            throw new UnauthorizedException(["token not found in store"]);
        });
        // console.log("storedToken", storedToken);
        if (!storedToken) {
            throw new UnauthorizedException(["token not found"]);
        }
        // console.log("storedToken", storedToken);
        if (req.cookies.Authentication !== storedToken) {
            throw new UnauthorizedException(["invalid token"]);
        }
        const user = await this.prismaService.getWholeUserByEmail(payload.email);
        return user;
    }
}
