import { Module } from "@nestjs/common";
import { PrismaService } from "./prisma.service";
import { UsersModule } from "./users/users.module";
import { AvatarModule } from "./avatar/avatar.module";
import { WsModule } from "./ws/ws.module";
import { AuthModule } from "./auth/auth.module";
import { ScheduleModule } from "@nestjs/schedule";
import * as dotenv from "dotenv";
import { ServeStaticModule } from "@nestjs/serve-static";
import { join } from "path";
dotenv.config();

@Module({
    imports: [
        ScheduleModule.forRoot(),
        AuthModule,
        WsModule,
        UsersModule,
        AvatarModule,
        ServeStaticModule.forRoot({
            rootPath: join(__dirname, "..", "client"),
            exclude: ["/api*"],
        }),
    ],
    providers: [PrismaService],
    exports: [PrismaService, AuthModule, WsModule],
})
export class AppModule {}
