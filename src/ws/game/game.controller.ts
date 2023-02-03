import { Controller, Get, NotFoundException, Param, Req, UseGuards } from "@nestjs/common";
import { GameService } from "./game.service";
import JwtAuthGuard from "../../auth/guard/jwt-auth.guard";
import { IRequestWithUser } from "src/auth/auths.interface";

@UseGuards(JwtAuthGuard)
@Controller("games")
export class GamesController {
    constructor(private readonly gameService: GameService) {}

    @Get("running")
    getRunningGames() {
        return this.gameService.getRunningGames();
    }
    @Get("users")
    getUserInGames() {
        return this.gameService.userInGameAnnounceStandalone();
    }
    @Get("play/:gameId")
    getPlayGame(@Req() request: IRequestWithUser, @Param("gameId") gameId: string) {
        const games = this.gameService.getRunningGames();
        const game = games.find((game) => game.gameId === gameId && (game.playerOneName === request.user.username || game.playerTwoName === request.user.username));
        console.log("fetch", games, game);
        if (!game) throw new NotFoundException();
        return "OK";
    }
    @Get("watch/:gameId")
    getWatchGame(@Req() request: IRequestWithUser, @Param("gameId") gameId: string) {
        const games = this.gameService.getRunningGames();
        const game = games.find((game) => game.gameId === gameId);
        console.log("fetch", games, game);
        if (!game) throw new NotFoundException();
        return "OK";
    }
}
