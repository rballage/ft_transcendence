import { Global, Injectable } from "@nestjs/common";
import { PrismaService } from "src/prisma.service";
import { Server, Socket } from "socket.io";
import UsersSockets from "./sockets.class";
@Global()
@Injectable()
export class WsService {
    public server: Server = null;
    public userSockets: UsersSockets;
    constructor(private readonly prismaService: PrismaService) {}

    notifyIfConnected(usernames: string[], eventName: string, eventData: any) {
        usernames.forEach((username) => {
            this.userSockets.emitToUser(username, eventName, eventData);
        });
    }
}
