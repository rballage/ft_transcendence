import { Module } from "@nestjs/common";
import { PrismaService } from "./prisma.service";
import { UsersModule } from "./users/users.module";
import { AvatarModule } from "./avatar/avatar.module";
import { WsModule } from "./ws/ws.module";
import { AuthModule } from "./auth/auth.module";
import { ScheduleModule } from "@nestjs/schedule";
import * as dotenv from "dotenv";
dotenv.config();

@Module({
    imports: [ScheduleModule.forRoot(), AuthModule, WsModule, UsersModule, AvatarModule],

    providers: [PrismaService],
    exports: [PrismaService, WsModule],
})
export class AppModule {}
