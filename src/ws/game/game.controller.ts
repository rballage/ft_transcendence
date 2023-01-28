import { Controller, Get, UseGuards } from "@nestjs/common";
import { GameService } from "./game.service";
import JwtAuthGuard from "../../auth/guard/jwt-auth.guard";

@UseGuards(JwtAuthGuard)
@Controller("games")
export class GamesController {
    constructor(private readonly gameService: GameService) {}

    @Get("running")
    getRunningGames() {
        return this.gameService.getRunningGames();
    }
}
