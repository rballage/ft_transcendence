import { Namespace, Server, Socket } from "socket.io";

export default class UneGame {
    public gameId: string;
    public socketP1: Socket;
    public socketP2: Socket;
    public intervalId: NodeJS.Timer;
    private frameUpdateEventName: string;
    private MouseMoveEventName: string;

    private max_score: number;
    private game_paused: boolean;
    private player_height: number = 100;
    private player_width: number = 8;
    private max_speed: number = 6;
    private anim: number = 0;

    private ball_x: number = 550;
    private ball_y: number = 360;
    private ball_r: number = 5;
    private ball_speed_x: number = 3;
    private ball_speed_y: number = Math.random() * 5;

    private player_one_y: number = 310;
    private player_one_score: number = 0;
    private player_two_y: number = 310;
    private player_two_score: number = 0;

    constructor(gameId: string, socketp1: Socket, socketp2: Socket, private server: Server) {
        this.gameId = gameId;
        this.socketP1 = socketp1;
        this.socketP2 = socketp2;
        this.max_score = 10;
        this.frameUpdateEventName = `${this.gameId}___frame-update`;
        this.frameUpdateEventName = `${this.gameId}___frame-update`;
        this.MouseMoveEventName = `${this.gameId}___mousemove`;
        this.MouseMoveEventName = `${this.gameId}___mousemove`;

        this.socketP1.join(gameId);
        this.socketP2.join(gameId);
        this.socketP1.once("disconnect", this.stopGame);
        this.socketP2.once("disconnect", this.stopGame);
        this.socketP1.once("quit", this.stopGame);
        this.socketP2.once("quit", this.stopGame);
        this.socketP1.on(this.MouseMoveEventName, (y: number) => {
            this.player_one_y = y;
        });
        this.socketP2.on(this.MouseMoveEventName, (y: number) => {
            this.player_two_y = y;
        });
    }

    async startGame() {
        this.game_paused = false;
        this.server
            .in(this.gameId)
            .timeout(5000)
            .emit("game-setup-and-init-go-go-power-ranger", this.gameId, async (err) => {
                if (err) console.error(err); // should cancel the game instead
                else {
                    this.game_paused = true;
                    this.startGameLoop();
                    const coutdown: any = this.countdownGenerator(5, undefined);
                    for await (const iterable of coutdown)
                        this.server.in(this.gameId).emit(`${this.gameId}___countdown`, {
                            value: iterable.value as string,
                            status: iterable.status,
                        });
                    this.game_paused = false;
                }
            });
    }
    // private async *gameStepsGenerator() {
    //     this.game_paused = true;
    //     yield new Promise((resolve, reject) => {
    //         try {
    //             this.server
    //                 .in(this.gameId)
    //                 .timeout(5000)
    //                 .emit("game-setup", this.gameId, async (error) => {
    //                     if (error) reject(error);
    //                     else resolve("players are both present");
    //                 });
    //         } catch (error) {
    //             reject(error);
    //         }
    //     }).then(() => this.startGameLoop());

    //     yield new Promise(async (resolve, reject) => {
    //         try {
    //             const coutdown: any = this.countdownGenerator(5, undefined);
    //             for await (const iterable of coutdown)
    //                 this.server.in(this.gameId).emit(`${this.gameId}___countdown`, {
    //                     value: iterable.value as string,
    //                     status: iterable.status,
    //                 });
    //             resolve("coutdown finished ready to start");
    //         } catch (error) {
    //             reject(error);
    //         }
    //     }).then(() => (this.game_paused = false));
    // }
    private startGameLoop() {
        this.intervalId = setInterval(this.sendFrame.bind(this), 10);
    }

    private sendFrame() {
        if (this.player_one_score >= this.max_score || this.player_two_score >= this.max_score) this.stopGame();
        else this.server.in(this.gameId).emit(this.frameUpdateEventName, this.getFrame());
    }

    private getFrame() {
        if (!this.game_paused) this.play();
        return {
            p1: this.player_one_y,
            p2: this.player_two_y,
            ball: { x: this.ball_x, y: this.ball_y },
            scorep1: this.player_one_score,
            scorep2: this.player_two_score,
        };
    }

    private async *countdownGenerator(seconds: number, callback: Function | undefined | null) {
        yield new Promise((resolve) => resolve({ value: seconds > 0 ? seconds : "", status: "pending" }));
        while (seconds >= 0) {
            yield new Promise((resolve) => setTimeout(() => resolve({ value: seconds > 0 ? seconds : "Go!", status: "pending" }), 1000));
            seconds--;
        }
        yield new Promise((resolve) =>
            setTimeout(() => {
                if (callback) callback();
                resolve({ value: seconds > 0 ? seconds : null, status: "done" });
            }, 1000)
        );
    }
    private async *countdownBreakGenerator(seconds: number, callback: Function | undefined | null) {
        yield new Promise((resolve) => resolve({ value: "", status: "pending" }));
        while (seconds >= 0) {
            yield new Promise((resolve) => setTimeout(() => resolve({ value: "", status: "pending" }), 1000));
            seconds--;
        }
        yield new Promise((resolve) =>
            setTimeout(() => {
                if (callback) callback();
                resolve({ value: seconds > 0 ? seconds : null, status: "done" });
            }, 1000)
        );
    }
    // private async *statesDispatchGenerator(seconds: Array<any>, callback: Function | undefined | null) {
    //     yield new Promise((resolve) => resolve({ value: seconds > 0 ? seconds : "Go!", status: "pending" }));

    // }

    private disconnectedP1() {
        this.stopGame();
    }

    private disconnectedP2() {
        this.stopGame();
    }

    stopGame() {
        let winnerUsername = null;
        let status = null;
        if (this.socketP1?.connected && this.socketP2?.connected) {
            winnerUsername = this.player_one_score > this.player_two_score ? this.socketP1.data.username : this.socketP1.data.username;
            status = `${winnerUsername} wins`;
        } else status = "game canceled";
        if (this.socketP1?.connected) {
            this.socketP1.emit(`${this.gameId}___game-end`, { value: status });
            this.socketP1.leave(this.gameId);
            this.socketP1.removeAllListeners(this.MouseMoveEventName);
        }
        if (this.socketP2?.connected) {
            this.socketP2.emit(`${this.gameId}___game-end`, { value: status });
            this.socketP2.leave(this.gameId);
            this.socketP2.removeAllListeners(this.MouseMoveEventName);
        }
        clearInterval(this.intervalId);
        this.socketP1 = null;
        this.socketP2 = null;
        this.server.serverSideEmit(`${this.gameId}___game-end`);
        this.server = null;
    }

    private changeDirection(playerPosition: number) {
        let impact_times_ratio = (this.ball_y - playerPosition - this.player_height / 2) * (100 / (this.player_height / 2));
        // Get a value between -10 and 10
        this.ball_speed_y = Math.round(impact_times_ratio / 10);
    }

    private collidep1() {
        if (this.ball_y < this.player_one_y || this.ball_y > this.player_one_y + this.player_height) {
            this.reset();
            this.player_two_score++;
            if (this.player_two_score < this.max_score) this.break();
            // this.resetScoreUpdate(1);
        } else {
            this.ball_speed_x *= -1;
            this.changeDirection(this.player_one_y);
            // if (Math.abs(this.ball_speed_x) < this.max_speed) {
            //     this.ball_speed_x += 1;
            // }
        }
    }
    private collidep2() {
        if (this.ball_y < this.player_two_y || this.ball_y > this.player_two_y + this.player_height) {
            this.reset();
            this.player_one_score++;
            if (this.player_one_score < this.max_score) this.break();
            // this.resetScoreUpdate(-1);
        } else {
            this.ball_speed_x *= -1;
            this.changeDirection(this.player_two_y);
            // if (Math.abs(this.ball_speed_x) < this.max_speed) {
            //     this.ball_speed_x += 1;
            // }
        }
    }
    private ballMove() {
        if (this.ball_y > 720 || this.ball_y < 0) {
            this.ball_speed_y *= -1;
        }

        if (this.ball_x > 1100 - this.player_width) {
            this.collidep2();
        } else if (this.ball_x < this.player_width) {
            this.collidep1();
        }
        if (!this.game_paused) {
            this.ball_x += this.ball_speed_x;

            this.ball_y += this.ball_speed_y;
        }
    }
    private resetScoreUpdate(speedDirection: number) {
        this.ball_x = 550;
        this.ball_y = 360;
        // this.game.playerOne.y = 310;
        // this.game.playerTwo.y = 310;
        this.ball_speed_x = 7;
        this.ball_speed_y = Math.random() * 3 * speedDirection;
    }

    private reset() {
        this.ball_x = 550;
        this.ball_y = 360; //a
        // this.game.playerOne.y = 310;
        // this.game.playerTwo.y = 310;
        this.ball_speed_x = 7 * (Math.random() < 0.5 ? -1 : 1);
        this.ball_speed_y = Math.random() * 3;
    }
    private play() {
        this.ballMove();
    }
    private async break() {
        const countdown: any = this.countdownBreakGenerator(0, () => (this.game_paused = true));
        this.game_paused = true;
        for await (const e of countdown) {
            this.server.in(this.gameId).emit(`${this.gameId}___countdown`, {
                value: e.value as string,
                status: e.status,
            });
        }
        this.game_paused = false;
    }
}
