import { Injectable } from "@nestjs/common";
import { PrismaService } from "src/prisma.service";
import { Server, Socket } from "socket.io";

@Injectable()
export class WsService {
    public server: Server = null;
    public socketMap: Map<string, Socket>;
    constructor(private readonly prismaService: PrismaService) {}

    async followAnnouncement(stalker: string, target) {
        console.log(this.server);
    }
}
