import { CacheModule, Module } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { AuthService } from "src/auth/auth.service";
import { PrismaService } from "src/prisma.service";
import { UsersService } from "src/users/users.service";
import { GameService } from "./game/game.service";
import { GamesController } from "./game/game.controller";
import { WsGateway } from "./ws.gateway";
import { ChatService } from "./chat/chat.service";
import { WsService } from "./ws.service";

@Module({
    imports: [
        CacheModule.register({
            ttl: 0,
            max: 100000,
        }),
    ],
    controllers: [GamesController],
    providers: [WsGateway, UsersService, PrismaService, JwtService, AuthService, GameService, ChatService, WsService],
    exports: [WsService],
})
export class WsModule {}
