import { Module } from "@nestjs/common";
import { PrismaService } from "./prisma.service";
import { UsersService } from "./users/users.service";
import { AuthService } from "./auth/auth.service";
import { AuthModule } from "./auth/auth.module";
import { UsersModule } from "./users/users.module";
import { ServeStaticModule } from "@nestjs/serve-static";
import { JwtModule, JwtService } from "@nestjs/jwt";
import * as dotenv from "dotenv";
import { JwtStrategy } from "./auth/strategy/jwt.strategy";
import { JwtRefreshStrategy } from "./auth/strategy/jwt-refresh.strategy";
import { AvatarModule } from "./avatar/avatar.module";
import { WsModule } from "./ws/ws.module";
import { WsService } from "./ws/ws.service";
dotenv.config();

@Module({
    imports: [UsersModule, AuthModule, JwtModule.register({ secret: `${process.env.JWT_ACCESS_SECRET}` }), AvatarModule, WsModule],

    providers: [PrismaService, UsersService, AuthService, JwtService, JwtRefreshStrategy, JwtStrategy, WsService],
    exports: [PrismaService, UsersService, AuthService, WsService],
})
export class AppModule {}
