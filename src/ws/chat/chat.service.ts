import { Injectable } from "@nestjs/common";
import { UsersService } from "src/users/users.service";

import { PrismaService } from "src/prisma.service";
import { Namespace, Server, Socket } from "socket.io";

@Injectable()
export class ChatService {
    public server: Server = null;
    public socketMap: Map<string, Socket> = null;

    constructor(private readonly prismaService: PrismaService) {}
}
