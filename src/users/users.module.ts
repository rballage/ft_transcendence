import { CacheModule, Module } from "@nestjs/common";
import { UsersService } from "./users.service";
import { AuthService } from "../auth/auth.service";

import { UsersController } from "./users.controller";
import { PrismaService } from "src/prisma.service";
import { JwtService } from "@nestjs/jwt";
import { WsService } from "src/ws/ws.service";

@Module({
    imports: [CacheModule.register()],
    controllers: [UsersController],
    providers: [UsersService, PrismaService, AuthService, JwtService, WsService],
    exports: [UsersService],
})
export class UsersModule {}
