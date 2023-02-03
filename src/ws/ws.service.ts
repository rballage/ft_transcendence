import { Injectable } from "@nestjs/common";

import { PrismaService } from "src/prisma.service";
import { Server, Socket } from "socket.io";

@Injectable()
export class WsService {
    public server: Server = null;
    constructor(private readonly prismaService: PrismaService) {}
}
