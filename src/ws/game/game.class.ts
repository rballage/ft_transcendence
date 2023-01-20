import { Namespace, Socket } from "socket.io";

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

    constructor(gameId: string, socketp1: Socket, socketp2: Socket, private server: Namespace) {
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
        this.socketP1.on("disconnect", this.stopGame);
        this.socketP2.on("disconnect", this.stopGame);
        this.socketP1.once("quit", this.stopGame);
        this.socketP2.once("quit", this.stopGame);
        this.socketP1.on(this.MouseMoveEventName, (y) => {
            this.player_one_y = y;
        });
        this.socketP2.on(this.MouseMoveEventName, (y) => {
            this.player_two_y = y;
        });
    }

    startGame() {
        // const context = this
        this.game_paused = false;
        this.server
            .in(this.gameId)
            .timeout(5000)
            .emit("game-setup-and-init-go-go-power-ranger", this.gameId, (err) => {
                if (err) console.error(err); // should cancel the game instead
                else {
                    this.startGameLoop();
                }
            });
    }
    startGameLoop() {
        this.intervalId = setInterval(this.sendFrame.bind(this), 10);
    }

    sendFrame() {
        if (!this.game_paused) {
            if (this.player_one_score >= this.max_score || this.player_two_score >= this.max_score) this.stopGame();
            else this.server.in(this.gameId).emit(this.frameUpdateEventName, this.getFrame());
        }
    }

    getFrame() {
        this.play();
        return {
            p1: this.player_one_y,
            p2: this.player_two_y,
            ball: { x: this.ball_x, y: this.ball_y },
            scorep1: this.player_one_score,
            scorep2: this.player_two_score,
        };
    }
    disconnectedP1() {
        this.stopGame();
    }

    disconnectedP2() {
        this.stopGame();
    }

    stopGame() {
        clearInterval(this.intervalId);
        this.server.in(this.gameId).emit(`${this.gameId}___game-end`, {});
        if (this.socketP1?.connected) {
            this.socketP1.leave(this.gameId);
            this.socketP1.removeAllListeners(this.MouseMoveEventName);
            // this.socketP1.removeAllListeners("disconnected");
            this.socketP1.removeAllListeners("quit");
        }
        if (this.socketP2?.connected) {
            this.socketP2.leave(this.gameId);
            this.socketP2.removeAllListeners(this.MouseMoveEventName);
            // this.socketP2.removeAllListeners("disconnected");
            this.socketP2.removeAllListeners("quit");
        }
        this.socketP1 = null;
        this.socketP2 = null;
        this.server = null;
    }

    changeDirection(playerPosition: number) {
        let impact_times_ratio =
            (this.ball_y - playerPosition - this.player_height / 2) * (100 / (this.player_height / 2));
        // Get a value between -10 and 10
        this.ball_speed_y = Math.round(impact_times_ratio / 10);
    }

    collidep1() {
        if (this.ball_y < this.player_one_y || this.ball_y > this.player_one_y + this.player_height) {
            this.reset();
            this.player_one_score++;
            this.resetScoreUpdate(1);
        } else {
            this.ball_speed_x *= -1;
            this.changeDirection(this.player_one_y);
            if (Math.abs(this.ball_speed_x) < this.max_speed) {
                this.ball_speed_x += 1;
            }
        }
    }
    collidep2() {
        if (this.ball_y < this.player_two_y || this.ball_y > this.player_two_y + this.player_height) {
            this.reset();
            this.player_two_score++;
            this.resetScoreUpdate(-1);
        } else {
            this.ball_speed_x *= -1;
            this.changeDirection(this.player_two_y);
            if (Math.abs(this.ball_speed_x) < this.max_speed) {
                this.ball_speed_x += 1;
            }
        }
    }
    ballMove() {
        if (this.ball_y > 720 || this.ball_y < 0) {
            this.ball_speed_y *= -1;
        }

        if (this.ball_x > 1100 - this.player_width) {
            this.collidep2();
        } else if (this.ball_x < this.player_width) {
            this.collidep1();
        }

        this.ball_x += this.ball_speed_x;
        this.ball_y += this.ball_speed_y;
    }
    resetScoreUpdate(speedDirection: number) {
        this.ball_x = 550;
        this.ball_y = 360;
        // this.game.playerOne.y = 310;
        // this.game.playerTwo.y = 310;
        this.ball_speed_x = 10;
        this.ball_speed_y = Math.random() * 3 * speedDirection;
    }

    reset() {
        this.ball_x = 550;
        this.ball_y = 360; //a
        // this.game.playerOne.y = 310;
        // this.game.playerTwo.y = 310;
        this.ball_speed_x = 10;
        this.ball_speed_y = Math.random() * 3;
    }
    play() {
        this.ballMove();
    }
}
