import { Global, Injectable } from "@nestjs/common";
import { PrismaService } from "src/prisma.service";
import { Server, Socket } from "socket.io";
import UsersSockets from "./sockets.class";
@Global()
@Injectable()
export class WsService {
    public server: Server = null;
    public socketMap: Map<string, Socket>;
    public userSockets: UsersSockets;
    constructor(private readonly prismaService: PrismaService) {}

    notifyIfConnected(usernames: string[], eventName: string, eventData: any) {
        usernames.forEach((username) => {
            this.socketMap.get(username)?.emit(eventName, eventData);
        });
    }
    isUserConnected(username: string): boolean {
        return this.socketMap.has(username);
    }
    forceDisconnectUser(username: string): void {
        console.log("force disconnect user");
        this.socketMap.get(username)?.disconnect(true);
    }
}
