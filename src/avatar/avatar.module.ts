import { Module } from "@nestjs/common";
import { AvatarService } from "./avatar.service";
import { AvatarController } from "./avatar.controller";
import { PrismaService } from "src/prisma.service";

@Module({
    imports: [],
    controllers: [AvatarController],
    providers: [PrismaService, AvatarService],
})
export class AvatarModule {}
