import { Global, Injectable } from "@nestjs/common";
import { PrismaService } from "src/prisma.service";
import { Server, Socket } from "socket.io";
@Global()
@Injectable()
export class WsService {
    public server: Server = null;
    public socketMap: Map<string, Socket>;
    constructor(private readonly prismaService: PrismaService) {}

    notifyIfConnected(usernames: string[], eventName: string, eventData: any) {
        usernames.forEach((username) => {
            this.socketMap.get(username)?.emit(eventName, eventData);
        });
    }
}
