import { Injectable } from "@nestjs/common";
import { UsersService } from "src/users/users.service";

import { PrismaService } from "src/prisma.service";
import { Namespace, Server, Socket } from "socket.io";
import UneGame from "./game.class";

@Injectable()
export class GameService {
    private gamesMap = new Map<string, UneGame>();

    constructor(private readonly usersService: UsersService, private readonly prismaService: PrismaService) {}

    async createGame(socketP1: Socket, socketP2: Socket, server: Server) {
        const gameEntry = await this.prismaService.game.create({
            data: { playerOneName: socketP1.data.username, playerTwoName: socketP2.data.username },
        });
        const game = new UneGame(gameEntry.id, socketP1, socketP2, server);
        this.gamesMap.set(gameEntry.id, game);
        server.once(`${gameEntry.id}___game-end`, () => {
            console.log("received game_end from server");
            this.gamesMap.delete(gameEntry.id);
        });
        game.startGame();
    }
}
// id              String    @id @unique @default(uuid())
// finishedAt      DateTime? @default(now())
// startedAt       DateTime  @default(now())
// score_playerOne Int       @default(0)
// score_playerTwo Int       @default(0)
// playerOne       User?     @relation("p1player", fields: [playerOneName], references: [username], onUpdate: Cascade, onDelete: SetNull)
// playerOneName   String?
// playerTwo       User?     @relation("p2player", fields: [playerTwoName], references: [username], onUpdate: Cascade, onDelete: SetNull)
// playerTwoName   String?
