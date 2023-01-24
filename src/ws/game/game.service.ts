import { Injectable } from "@nestjs/common";
import { UsersService } from "src/users/users.service";

import { PrismaService } from "src/prisma.service";
import { Namespace, Server, Socket } from "socket.io";
import UneGame from "./game.class";
import { Game } from "@prisma/client";

@Injectable()
export class GameService {
    private gamesMap = new Map<string, UneGame>();

    constructor(private readonly usersService: UsersService, private readonly prismaService: PrismaService) {}

    async createGame(socketP1: Socket, socketP2: Socket, server: Server) {
        const gameEntry: Game = await this.prismaService.game.create({
            data: { playerOneName: socketP1.data.username, playerTwoName: socketP2.data.username },
        });
        const game = new UneGame(gameEntry.id, socketP1, socketP2, server);
        this.gamesMap.set(gameEntry.id, game);
        // server.once(`${gameEntry.id}___game-end`, () => {
        //     console.log("received game_end from server");
        //     this.gamesMap.delete(gameEntry.id);
        // });
        try {
            const gameResult: any = await game.startGame();
            const resGame: Game = await this.prismaService.game.update({ where: { id: gameEntry.id }, data: gameResult });
            await this.setWinsAndDefeats(resGame);
            console.log(resGame);
        } catch (error) {
            console.log(error.status);
            const resGame: Game = await this.prismaService.game.update({ where: { id: gameEntry.id }, data: error.data });
            await this.setWinsAndDefeats(resGame);
        }
        this.gamesMap.delete(gameEntry.id);
    }
    spectateGame(Spectator: Socket, gameid: string, server: Server) {
        const game = this.gamesMap.get(gameid);
        game.addSpectator(Spectator);
    }

    async setWinsAndDefeats(gameEntry: Game) {
        const player1 = await this.prismaService.user.findFirst({
            where: { username: gameEntry.playerOneName },
            select: {
                victoriesAsPOne: true,
                victoriesAsPTwo: true,
                defeatsAsPOne: true,
                defeatsAsPTwo: true,
            },
        });
        const player2 = await this.prismaService.user.findFirst({
            where: { username: gameEntry.playerTwoName },
            select: {
                victoriesAsPOne: true,
                victoriesAsPTwo: true,
                defeatsAsPOne: true,
                defeatsAsPTwo: true,
            },
        });
        if (gameEntry.score_playerOne == gameEntry.score_playerTwo) {
        } else if (gameEntry.score_playerOne > gameEntry.score_playerTwo) {
            await this.prismaService.user.update({
                where: { username: gameEntry.playerOneName },
                data: { victoriesAsPOne: player1.victoriesAsPOne + 1 },
            });
            await this.prismaService.user.update({
                where: { username: gameEntry.playerTwoName },
                data: { defeatsAsPTwo: player2.defeatsAsPTwo + 1 },
            });
        } else {
            await this.prismaService.user.update({
                where: { username: gameEntry.playerOneName },
                data: { defeatsAsPOne: player1.defeatsAsPOne + 1 },
            });
            await this.prismaService.user.update({
                where: { username: gameEntry.playerTwoName },
                data: { victoriesAsPTwo: player2.victoriesAsPTwo + 1 },
            });
        }
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
