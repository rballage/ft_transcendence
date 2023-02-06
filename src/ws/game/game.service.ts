import { Injectable } from "@nestjs/common";

import { PrismaService } from "src/prisma.service";
import { Server, Socket } from "socket.io";
import UneGame from "./game.class";
import { Game } from "@prisma/client";
import { running_game } from "../../utils/types/ws.output.types";
import { GameInvitePayload, GameOptions } from "../../utils/dto/ws.input.dto";

type GameObject = {
    game: UneGame;
    data: Game;
    spectators: Map<string, Socket>;
    map: string;
};

@Injectable()
export class GameService {
    private gamesMap = new Map<string, GameObject>();

    private waitingList = new Set<string>();
    public server: Server = null;
    public socketMap: Map<string, Socket> = null;

    constructor(private readonly prismaService: PrismaService) {}

    getRunningGames() {
        let games: running_game[] = [];
        this.gamesMap.forEach((gameobj: GameObject, gameId: string) => {
            const obj: running_game = {
                gameId,
                startedAt: gameobj.data.startedAt,
                playerOneName: gameobj.data.playerOneName,
                playerTwoName: gameobj.data.playerTwoName,
                map: gameobj.map,
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
        const games = this.getRunningGames();
        this.server.emit("game-announcement", games);
        let userInGames: any[] = [];
        if (games.length > 0) {
            games.forEach((game: running_game) => {
                userInGames.push({ username: game.playerOneName, gameId: game.gameId, map: game.map });
                userInGames.push({ username: game.playerTwoName, gameId: game.gameId, map: game.map });
            });
        }
        this.server.emit("users-in-game-announcement", userInGames);
    }

    userInGameAnnounceStandalone() {
        const games = this.getRunningGames();
        let userInGames: any[] = [];
        if (games.length > 0) {
            games.forEach((game: running_game) => {
                userInGames.push({ username: game.playerOneName, gameId: game.gameId, map: game.map });
                userInGames.push({ username: game.playerTwoName, gameId: game.gameId, map: game.map });
            });
        }
        this.server.emit("users-in-game-announcement", userInGames);
    }

    async createGame(socketP1: Socket, socketP2: Socket, options: GameOptions) {
        const playerOneUsername = socketP1.data.username;
        const playerTwoUsername = socketP2.data.username;
        const gameEntry: Game = await this.prismaService.game.create({
            data: { playerOneName: playerOneUsername, playerTwoName: playerTwoUsername },
        });
        try {
            const game = new UneGame(gameEntry.id, socketP1, socketP2, this.server, options);
            this.gamesMap.set(gameEntry.id, { game, data: gameEntry, spectators: new Map<string, Socket>(), map: options.map });
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
        // https://www.prisma.io/docs/reference/api-reference/prisma-client-reference#atomic-number-operations

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
        spectator.join(gameid);
    }

    removeSpectator(spectator: Socket, gameid: string) {
        spectator.leave(gameid);
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

    gameInvite(client: Socket, data: GameInvitePayload) {
        let canceled: boolean = false;
        console.log(data);
        const targetSocket: any = this.socketMap.get(data.target_user);
        if (targetSocket && !this.isTargetBusy(data.target_user)) {
            client.once("game-invite-canceled", () => {
                targetSocket.emit("game-invite-canceled", "CANCELED");
                canceled = true;
            });
            client.once("disconnect", () => {
                targetSocket.emit("game-invite-canceled", "CANCELED");
                canceled = true;
            });
            targetSocket.once("disconnect", () => {
                client.emit("game-invite-declined", "DECLINED");
                canceled = true;
            });
            targetSocket.timeout(30000).emit("game-invite", { ...data, from: client.data.username }, async (err, response) => {
                if (!canceled && response === "ACCEPTED") {
                    client.removeAllListeners("game-invite-canceled");
                    client.emit("game-invite-accepted");
                    this.createGame(client, targetSocket, { difficulty: data.difficulty, map: data.map } as GameOptions);
                } else if (canceled && !err) {
                    // client.emit("game-invite-declined");
                    targetSocket.emit("game-invite-canceled", "CANCELED");
                } else if (err) {
                    client.emit("game-invite-declined", "TIMEOUT");
                    targetSocket.emit("game-invite-canceled", "CANCELED");
                } else if (response !== "ACCEPTED") {
                    client.emit("game-invite-declined", "DECLINED");
                }
            });
        } else {
            client.emit("game-invite-declined", "NOT_CONNECTED");
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

// await this.prismaService.$executeRawUnsafe(`UPDATE "User" SET "defeatsAsPOne" = "defeatsAsPOne" + 1 WHERE username = '${gameEntry.playerOneName}'`);
// await this.prismaService.$executeRawUnsafe(`UPDATE "User" SET "victoriesAsPTwo" = "victoriesAsPTwo" + 1 WHERE username = '${gameEntry.playerTwoName}';`);
// await this.prismaService.$executeRawUnsafe(`UPDATE "User" SET "defeatsAsPTwo" = "defeatsAsPTwo" + 1 WHERE username = '${gameEntry.playerTwoName}';`);
// await this.prismaService.$executeRawUnsafe(`UPDATE "User" SET "victoriesAsPOne" = 100 WHERE username = '${gameEntry.playerOneName}';`);
