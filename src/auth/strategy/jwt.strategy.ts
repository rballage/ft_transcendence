import { PassportStrategy } from "@nestjs/passport";
import { HttpException, Injectable } from "@nestjs/common";
// import { AuthService } from './auth.service';
// import { User } from '@prisma/client';

import { ExtractJwt, Strategy } from "passport-jwt";
// import { ConfigService } from '@nestjs/config';
import { Request } from "express";
import { UsersService } from "../../users/users.service";
import { ITokenPayload } from "../auths.interface";
import * as dotenv from "dotenv";
import { PrismaService } from "src/prisma.service";
dotenv.config();

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, "jwt") {
    constructor(private readonly prismaService: PrismaService) {
        super({
            secretOrKey: `${process.env.JWT_ACCESS_SECRET}`,
            jwtFromRequest: ExtractJwt.fromExtractors([
                (request: Request) => {
                    // console.log("access guard", request.cookies);
                    if (!request?.cookies?.Authentication) throw new HttpException("No Tokens, must login", 417);

                    return request?.cookies?.Authentication;
                },
            ]),
        });
    }

    async validate(payload: ITokenPayload) {
        console.log("access guard validate");
        const user = await this.prismaService.getUser(payload.username);
        return user;
    }
}
