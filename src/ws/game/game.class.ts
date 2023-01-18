import { Namespace, Socket } from "socket.io";

export default class UneGame {
	public gameId : string;
	public socketP1 : Socket;
	public socketP2 : Socket;
	public intervalId : NodeJS.Timer;
	private frameUpdateEventName: string

	constructor(gameId: string,
		socketp1 : Socket,
		socketp2 : Socket,
		private server : Namespace) {
		this.gameId = gameId
		this.socketP1 = socketp1
		this.socketP2 = socketp2
		this.socketP1.join(gameId)
		this.socketP2.join(gameId)
		this.socketP1.on(`${gameId}___mousemove`, this.updatePositionP1)
		this.socketP2.on(`${gameId}___mousemove`, this.updatePositionP2)
		this.socketP1.on('disconnect', this.disconnectedP1)
		this.socketP2.on('disconnect', this.disconnectedP2)
		this.socketP1.once('quit', this.disconnectedP1)
		this.socketP2.once('quit', this.disconnectedP2)
		this.frameUpdateEventName = `${gameId}___frame-update`
	}

	updatePositionP1(socket, data){
		// this.x = data.x
	}
	updatePositionP2(socket, data){
		// this.x = data.x
	}

	async startGame(){
		this.server.in(this.gameId).timeout(5000).emit('game-setup-and-init-go-go-power-ranger', this.gameId, async (err, res) => {
			if (err) {
				console.error(err)
			}
			else {
				this.intervalId = setInterval(() => {
					// this.play();
					this.server.in(this.gameId).emit(this.frameUpdateEventName, null) // <-- aymeric tu met un getter ici qui va get les info de la next frame
				}, 33)
				setTimeout(()=> {
					this.stopGame()
				}, 1000)
			}
		})


	}
	disconnectedP1()
	{
	}

	disconnectedP2()
	{
	}

	stopGame()
	{
		clearInterval(this.intervalId);
		this.server.in(this.gameId).emit(`${this.gameId}___game-end`, {})
		this.socketP1.leave(this.gameId)
		this.socketP2.leave(this.gameId)
		this.socketP1.removeListener(`${this.gameId}___mousemove`, this.updatePositionP1)
		this.socketP2.removeListener(`${this.gameId}___mousemove`, this.updatePositionP2)
		this.socketP1.removeListener('disconnected', this.disconnectedP1)
		this.socketP2.removeListener('disconnected', this.disconnectedP2)
		this.socketP1 = null;
		this.socketP2 = null;
		this.server = null;
	}

}

class Speed {
    x : number;
    y : number;
    constructor() {
       this.x = 10;
       this.y = Math.random() * 5
    }
};

class Ball {
    x : number;
    y : number;
    r: number;
    speed: Speed;
    constructor() {
        this.x  = 550;
        this.y  = 360;
        this.r = 5;
        this.speed = new Speed;
     }
}
class Player {
    username    : string;
    socketID    : string;
    score       : number;
    y           : number;

    constructor (username: string, socketID: string) {
        this.username   = username;
        this.socketID   = socketID;
        this.score      = 0;
        this.y          = 310;
    };
};

class Game {
    playerOne   : Player;
    playerTwo   : Player;
    ball        : Ball;

    constructor (usernameP1: string, socketIDP1: string, usernameP2: string, socketIDP2: string) {
        this.playerOne  = new Player(usernameP1, socketIDP1);
        this.playerTwo  = new Player(usernameP2, socketIDP2);
        this.ball       = new Ball;
    }
};

class GameInfo {
    player_height   : number;
    player_width    : number;
    max_speed       : number;
    game            : Game;
    anim            : number;

    constructor(usernameP1: string, socketIDP1: string, usernameP2: string, socketIDP2: string, gameoption : Object) {
        this.player_height = 100;
        this.player_width = 5;
        this.max_speed = 20;
        this.game = new Game(usernameP1, socketIDP1, usernameP2, socketIDP2);
        this.anim = 0;
    };
    //server part
    changeDirection(playerPosition: any) {
        var impact = this.game.ball.y - playerPosition - this.player_height / 2;
        var ratio = 100 / (this.player_height / 2);

        // Get a value between -10 and 10
        this.game.ball.speed.y = Math.round(impact * ratio / 10);
        // console.log(this.game.ball.speed.y)
    };
    collide(player: any) {

        if (this.game.ball.y < player.y || this.game.ball.y > player.y + this.player_height) {
            this.reset();
            if (player == this.game.playerOne) {
                this.game.playerOne.score++;
                this.resetScoreUpdate(1);
            } else {
                this.game.playerTwo.score++;
                this.resetScoreUpdate(-1);
            }
        } else {
            this.game.ball.speed.x *= -1;
            this.changeDirection(player.y);
            if (Math.abs(this.game.ball.speed.x) < this.max_speed) {
                this.game.ball.speed.x += 1;
            }
        }
    };
    ballMove() {
        if (this.game.ball.y > 720 || this.game.ball.y < 0) {
            this.game.ball.speed.y *= -1;
        }

        if (this.game.ball.x > (1100 - this.player_width)) {
            this.collide(this.game.playerTwo);
        } else if (this.game.ball.x < this.player_width) {
            this.collide(this.game.playerOne);
        }

        this.game.ball.x += this.game.ball.speed.x;
        this.game.ball.y += this.game.ball.speed.y;
    };
    resetScoreUpdate(speedDirection : number)
    {
        this.game.ball.x = 550;
        this.game.ball.y = 360;
        this.game.playerOne.y = 310;
        this.game.playerTwo.y = 310;
        this.game.ball.speed.x = 10;
        this.game.ball.speed.y = Math.random() * 3 * speedDirection;
    }
    // reset() {
    //     this.game.ball.x = 550;
    //     this.game.ball.y = 360;
    //     this.game.playerOne.y = 310;
    //     this.game.playerTwo.y = 310;
    //     this.game.ball.speed.x = 10;
    //     this.game.ball.speed.y = Math.random() * 3 * speedDirection;
    // }
    reset() {
        this.game.ball.x = 550;
        this.game.ball.y = 360;//a
        this.game.playerOne.y = 310;
        this.game.playerTwo.y = 310;
        this.game.ball.speed.x = 10;
        this.game.ball.speed.y = Math.random() * 3;
    };
    play() {
        if (this.game.playerOne.score === 2 || this.game.playerTwo.score === 2) {
            console.log("end game")
            this.stop();
            return;
        }
        this.checkDisconect();
        this.ballMove();
		setTimeout(()=>{

			return this.play()
		}, 30)
        // async ? this.getPlayersMoves();
        /* emit data */
        /* wait 1000/30 ms ? */
        this.play();
    };
    getPlayersMoves()
    {
        /* receive playerOne mouseposition */
        /* receive playerTwo mouseposition */
    };
    checkDisconect () {

        if(this.game.playerOne /* is diconected */ )
        {
            this.game.playerTwo.score = 10;
            this.game.playerOne.score = 0;
            this.stop();
        }
        else if(this.game.playerTwo /* is diconected */ )
        {
            this.game.playerOne.score = 10;
            this.game.playerTwo.score = 0;
            this.stop();
        }
    };
    stop ()
    {
        /* emit end of game */
    };
};
