import { CacheModule, Global, Module } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";
import { UsersModule } from "../users/users.module";
import { UsersService } from "../users/users.service";
import { PrismaService } from "src/prisma.service";
import { PassportModule } from "@nestjs/passport";
import { LocalStrategy } from "./strategy/local.strategy";

import { JwtModule } from "@nestjs/jwt";
// import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtStrategy } from "./strategy/jwt.strategy";
import { JwtRefreshStrategy } from "./strategy/jwt-refresh.strategy";
import * as dotenv from "dotenv";
dotenv.config();
@Global()
@Module({
    imports: [
        PassportModule,
        JwtModule.registerAsync({
            useFactory: async () => ({
                secret: `${process.env.JWT_ACCESS_SECRET}`,
                signOptions: { expiresIn: process.env.JWT_ACCESS_EXPIRATION_TIME },
            }),
        }),
        CacheModule.register(),
    ],
    controllers: [AuthController],
    providers: [PassportModule, AuthService, PrismaService, LocalStrategy, JwtRefreshStrategy, JwtStrategy],
    exports: [AuthService, LocalStrategy, JwtStrategy, JwtRefreshStrategy],
})
export class AuthModule {}
