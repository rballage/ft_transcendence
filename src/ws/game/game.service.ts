import { Injectable } from "@nestjs/common";

import { PrismaService } from "src/prisma.service";
import { Server, Socket } from "socket.io";
import UneGame from "./game.class";
import { Game } from "@prisma/client";
import { running_game } from "../../utils/types/ws.output.types";
import { GameInvitePayload, GameOptions } from "../../utils/dto/ws.input.dto";
import UsersSockets from "../sockets.class";
// import uuidv4 from "uuid/v4"
// const uuidv4 = require("uuid/v4")

// uuidv4()

type GameObject = {
    game: UneGame;
    data: Game;
    spectators: Map<string, Socket>;
    map: string;
};

@Injectable()
export class GameService {
    private gamesMap = new Map<string, GameObject>();

    private waitingList = new Map<string, Set<Socket>>();
    private playerInMatchMaking = new Set<string>()
    public server: Server = null;
    public socketMap: Map<string, Socket> = null;
    public userSockets: UsersSockets;

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
        //console.log("RUNNING GAMES=", games);
        return games;
    }
    isTargetBusy(username: string): boolean {
        const runningGames = this.getRunningGames();
        return runningGames.find((game) => game.playerOneName === username || game.playerTwoName === username) ? true : false;
    }

    handleMatchMakingRequest(client: Socket, data: GameInvitePayload) {
        // console.log("handleMatchMakingRequest");
        if (!this.playerInMatchMaking.has(client.data.username))
        {
            if (!this.waitingList.has(JSON.stringify({ difficulty: data.difficulty, map: data.map } as any)))
                this.waitingList.set(JSON.stringify({ difficulty: data.difficulty, map: data.map } as any) as any, new Set<Socket>([client]));
            else this.waitingList.get(JSON.stringify({ difficulty: data.difficulty, map: data.map } as any)).add(client); // as any, new Array<Socket>(client))
            client.once("matchmaking-canceled", () => {
                this.cancelMatchmaking(client);
            });
            client.once("disconnect", () => {
                this.cancelMatchmaking(client);
            });
            this.playerInMatchMaking.add(client.data.username)
            this.tryCreateMatchmakingGame();
        }
        else
        {
            console.log("already-in-matchmacking")
            client.emit("already-in-matchmacking");
        }
    }

    cancelMatchmaking(client: Socket) {
        // this.waitingList.delete(client.data.username);
        for (const [key, value] of this.waitingList) {
            // //console.log("here cancelMatchmaking");
            // //console.log(value);
            if (value)
            {
                this.waitingList.get(key).delete(client);
                this.playerInMatchMaking.delete(client.data.username)
            }
            // //console.log("--------------------------");
            // //console.log(value);
            // .remove(client);
            // .remove(client);
            // //console.log("here cancel mm")
            // //console.log('--------------------------')
            // //console.log(this.waitingList.get(key))
            // //console.log('--------------------------')
            // //console.log(value)
            // //console.log('--------------------------')
            // {

            //     this.waitingList[key].delete(client);
            // }
        }
        // client.removeAllListeners("game-invite-canceled");
    }

    tryCreateMatchmakingGame() {
        // console.log("waitinglist",this.waitingList.keys())
        // console.log("playerInMatchMaking",this.playerInMatchMaking)
        for (const [key, value] of this.waitingList) {
            //console.log(value);
            while (value.size >= 2) {
                let setit = Array.from(value.values());
                let user1 = setit[0];
                let user2 = setit[1];

                this.waitingList.get(key).delete(user1);
                this.waitingList.get(key).delete(user2);
                this.playerInMatchMaking.delete(user1.data.username)
                this.playerInMatchMaking.delete(user2.data.username)
                console.log("tryCreateMatchmakingGame")
                this.createGame(user1, user2, JSON.parse(key));
            }
        }
    }

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
        // this.userSockets.
        const gameEntry: Game = await this.prismaService.game.create({
            data: { playerOneName: playerOneUsername, playerTwoName: playerTwoUsername },
        });
        try {
            socketP1.data.status = "INGAME"
            socketP2.data.status = "INGAME"
            this.server.emit("users-status", this.userSockets.usersStatus);
            const game = new UneGame(gameEntry.id, socketP1, socketP2, this.server, options);
            this.gamesMap.set(gameEntry.id, { game, data: gameEntry, spectators: new Map<string, Socket>(), map: options.map });
            this.gameAnnounce();
            const gameResult: any = await game.startGame();
            console.log("GAME RESULT", gameResult);
            socketP1.data.status = "ONLINE"
            socketP2.data.status = "ONLINE"
            this.server.emit("users-status", this.userSockets.usersStatus);
            await this.setScoresInDB(socketP1.data.username, socketP2.data.username, gameResult, gameEntry.id);
            this.gameAnnounce();
            this.gamesMap.delete(gameEntry.id);
        } catch (error) {
            if (socketP1?.connected) socketP1.data.status = "ONLINE";
            if (socketP2?.connected) socketP2.data.status = "ONLINE";
            this.server.emit("users-status", this.userSockets.usersStatus);
            //console.log("game failed", error);
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
        spectator.data.status = "WATCHING"
        spectator.join(gameid);
    }

    removeSpectator(spectator: Socket, gameid: string) {
        spectator.data.status = "ONLINE"
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

    // gameInvite(client: Socket, data: GameInvitePayload)
    // {
    //     let canceled: boolean = false;
    //     this.server.on('game-invite', (socket: rooms) => {
    //         if (socket.rooms.incluldes("alskjdlkasjdlkas")){

    //         }
    //     })

    //     this.userSockets.

    //     // targetUser = this.
    // }


    gameInvite(client: Socket, data: GameInvitePayload) {
        let canceled: boolean = false;
        //console.log(data);


        if (!this.isTargetBusy(data.target_user)) {
            const room  = client.id + "game-invite"
            this.userSockets.joinUser(data.target_user, room)
            client.once("game-invite-canceled", () => {
               this.userSockets.emitToUser(data.target_user, "game-invite-canceled", "CANCELED");
                canceled = true;
            });
            client.once("disconnect", () => {
               this.userSockets.emitToUser(data.target_user, "game-invite-canceled", "CANCELED");
                canceled = true;
            });
            // this.server.of("/").adapter.on("delete-room", (room) => {
            //     console.log("delete-room")
            //     client.emit("game-invite-declined", "DECLINED");
            //     canceled = true;
            // })
            const targetSockets = this.userSockets.getUserSockets(data.target_user);
            if (!targetSockets)
                throw new Error('no socket found');
            const PromisesArray : Promise<any>[]= []
            targetSockets.forEach(socket => {
                PromisesArray.push(new Promise((resolve, reject)=> {
                    socket.once("disconnect", () => {
                        reject({res: "DISCONNECTED", socket})
                    })
                }))
            })
            targetSockets.forEach(socket => {
                PromisesArray.push(new Promise((resolve, reject)=> {
                    socket.timeout(30000).volatile.emit("game-invite", { ...data, from: client.data.username }, async (err, response) => {
                        if (err) {
                            reject({res:"TIMEOUT", socket})
                        }
                        if (canceled){
                            console.log("cancel")
                            reject({res:"CANCELED", socket})}
                        if (response === "ACCEPTED") {
                            resolve({res:"ACCEPTED", socket})
                        }
                        else if (response === "DECLINED") {
                            reject({res:"DECLINED", socket})
                        }
                    })
                }))
            });
            Promise.race(PromisesArray).then((res) => {
                client.emit("game-invite-accepted");
                this.createGame(client, res.socket, { difficulty: data.difficulty, map: data.map } as any );
                targetSockets.forEach((socket) => {
                    if (socket.id != res.socket.id)
                        socket.emit("game-invite-canceled", "CANCELED")
                })

            }).catch((res)=> {
                // if (res.res === "CANCELED")
                this.userSockets.emitToUser(data.target_user, "game-invite-canceled", res.res)
                client.emit("game-invite-declined", res.res)
            })
            this.userSockets.leaveUser(data.target_user, room);
            // targetSocket.timeout(30000).emit("game-invite", { ...data, from: client.data.username }, async (err, response) => {
            //     if (!canceled && response === "ACCEPTED") {
            //         client.removeAllListeners("game-invite-canceled");
            //         client.emit("game-invite-accepted");
            //         this.createGame(client, targetSocket, { difficulty: data.difficulty, map: data.map } as any);
            //     } else if (canceled && !err) {
            //         // client.emit("game-invite-declined");
            //         targetSocket.emit("game-invite-canceled", "CANCELED");
            //     } else if (err) {
            //         client.emit("game-invite-declined", "TIMEOUT");
            //         targetSocket.emit("game-invite-canceled", "CANCELED");
            //     } else if (response !== "ACCEPTED") {
            //         client.emit("game-invite-declined", "DECLINED");
            //     }
            // });
        } else {
            client.emit("game-invite-declined", "NOT_CONNECTED");
        }
        // if (targetSocket && !this.isTargetBusy(data.target_user)) {
        //     client.once("game-invite-canceled", () => {
        //         targetSocket.emit("game-invite-canceled", "CANCELED");
        //         canceled = true;
        //     });
        //     client.once("disconnect", () => {
        //         targetSocket.emit("game-invite-canceled", "CANCELED");
        //         canceled = true;
        //     });
        //     this.server.on('disconnect', (socket: Socket) => {
        //         if (socket.rooms.has("alskjdlkasjdlkas")){

        //         }
        //     })
        //     targetSocket.once("disconnect", () => {
        //         client.emit("game-invite-declined", "DECLINED");
        //         canceled = true;
        //     });
        //     targetSocket.timeout(30000).emit("game-invite", { ...data, from: client.data.username }, async (err, response) => {
        //         if (!canceled && response === "ACCEPTED") {
        //             client.removeAllListeners("game-invite-canceled");
        //             client.emit("game-invite-accepted");
        //             this.createGame(client, targetSocket, { difficulty: data.difficulty, map: data.map } as any);
        //         } else if (canceled && !err) {
        //             // client.emit("game-invite-declined");
        //             targetSocket.emit("game-invite-canceled", "CANCELED");
        //         } else if (err) {
        //             client.emit("game-invite-declined", "TIMEOUT");
        //             targetSocket.emit("game-invite-canceled", "CANCELED");
        //         } else if (response !== "ACCEPTED") {
        //             client.emit("game-invite-declined", "DECLINED");
        //         }
        //     });
        // } else {
        //     client.emit("game-invite-declined", "NOT_CONNECTED");
        // }
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
