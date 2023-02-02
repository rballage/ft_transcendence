import { Injectable } from "@nestjs/common";
import { UsersService } from "src/users/users.service";

import { PrismaService } from "src/prisma.service";
import { Namespace, Server, Socket } from "socket.io";
import UneGame from "./game.class";
import { Game } from "@prisma/client";
import { running_game } from "../types/ws.output.types";
import { GameOptions } from "../dto/ws.input.dto";

type GameObject = {
    game: UneGame;
    data: Game;
    spectators: Map<string, Socket>;
};

@Injectable()
export class GameService {
    private gamesMap = new Map<string, GameObject>();
    private waitingList = new Set<string>();
    public server: Server = null;
    constructor(private readonly prismaService: PrismaService) {}

    getRunningGames() {
        let games: running_game[] = [];
        this.gamesMap.forEach((gameobj: GameObject, gameId: string) => {
            const obj: running_game = {
                gameId,
                startedAt: gameobj.data.startedAt,
                playerOneName: gameobj.data.playerOneName,
                playerTwoName: gameobj.data.playerTwoName,
            };
            games.push(obj);
        });
        console.log("RUNNING GAMES=", games);
        return games;
    }
    isTargetBusy(username: string): boolean {
        const runningGames = this.getRunningGames();
        return runningGames.find((game) => game.playerOneName === username || game.playerTwoName === username) ? true : false;
    }

    handleMatchMakingRequest(client: Socket) {}

    gameAnnounce() {
        this.server.emit("game-announcement", this.getRunningGames());
    }
    async createGame(socketP1: Socket, socketP2: Socket, options: GameOptions) {
        const playerOneUsername = socketP1.data.username;
        const playerTwoUsername = socketP2.data.username;
        const gameEntry: Game = await this.prismaService.game.create({
            data: { playerOneName: playerOneUsername, playerTwoName: playerTwoUsername },
        });
        try {
            const game = new UneGame(gameEntry.id, socketP1, socketP2, this.server, options);
            this.gamesMap.set(gameEntry.id, { game, data: gameEntry, spectators: new Map<string, Socket>() });
            this.gameAnnounce();
            const gameResult: any = await game.startGame();
            console.log("GAME RESULT", gameResult);
            await this.setScoresInDB(playerOneUsername, playerTwoUsername, gameResult, gameEntry.id);
            this.gameAnnounce();
            this.gamesMap.delete(gameEntry.id);
        } catch (error) {
            console.log("game failed", error);
            await this.prismaService.game.delete({ where: { id: gameEntry.id } });
            this.gameAnnounce();
            this.gamesMap.delete(gameEntry.id);
        }
    }

    async setScoresInDB(playerOneUsername: string, playerTwoUsername: string, gameResult: any, gameId: string) {
        const player1Scores = await this.getPlayerScores(playerOneUsername);
        const player2Scores = await this.getPlayerScores(playerTwoUsername);

        if (gameResult.score_playerOne > gameResult.score_playerTwo) {
            await this.prismaService.$transaction([
                this.prismaService.game.update({
                    where: { id: gameId },
                    data: gameResult,
                }),
                this.prismaService.user.update({
                    where: { username: playerOneUsername },
                    data: { victoriesAsPOne: player1Scores.victoriesAsPOne + 1 },
                }),
                this.prismaService.user.update({
                    where: { username: playerTwoUsername },
                    data: { defeatsAsPTwo: player2Scores.defeatsAsPTwo + 1 },
                }),
            ]);
        } else {
            await this.prismaService.$transaction([
                this.prismaService.game.update({
                    where: { id: gameId },
                    data: gameResult,
                }),
                this.prismaService.user.update({
                    where: { username: playerOneUsername },
                    data: { defeatsAsPOne: player1Scores.defeatsAsPOne + 1 },
                }),
                this.prismaService.user.update({
                    where: { username: playerTwoUsername },
                    data: { victoriesAsPTwo: player2Scores.victoriesAsPTwo + 1 },
                }),
            ]);
        }
    }
    addSpectator(spectator: Socket, gameid: string) {
        // const gameObj = this.gamesMap.get(gameid);
        // if (!gameObj) throw new Error("NOT_FOUND");
        // if (gameObj?.spectators.has(spectator.data.username)) {
        //     gameObj.spectators.set(spectator.data.username, spectator);
        spectator.join(gameid);
        // }
    }
    removeSpectator(spectator: Socket, gameid: string) {
        // const gameObj = this.gamesMap.get(gameid);
        // if (!gameObj) throw new Error("NOT_FOUND");
        // if (gameObj?.spectators.has(spectator.data.username)) {
        //     gameObj.spectators.delete(spectator.data.username);
        spectator.leave(gameid);
        // }
    }
    async getPlayerScores(username: string) {
        return await this.prismaService.user.findFirstOrThrow({
            where: { username: username },
            select: {
                victoriesAsPOne: true,
                victoriesAsPTwo: true,
                defeatsAsPOne: true,
                defeatsAsPTwo: true,
            },
        });
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

// await this.prismaService.$executeRawUnsafe(`UPDATE "User" SET "defeatsAsPOne" = "defeatsAsPOne" + 1 WHERE username = '${gameEntry.playerOneName}'`);
// await this.prismaService.$executeRawUnsafe(`UPDATE "User" SET "victoriesAsPTwo" = "victoriesAsPTwo" + 1 WHERE username = '${gameEntry.playerTwoName}';`);
// await this.prismaService.$executeRawUnsafe(`UPDATE "User" SET "defeatsAsPTwo" = "defeatsAsPTwo" + 1 WHERE username = '${gameEntry.playerTwoName}';`);
// await this.prismaService.$executeRawUnsafe(`UPDATE "User" SET "victoriesAsPOne" = 100 WHERE username = '${gameEntry.playerOneName}';`);
