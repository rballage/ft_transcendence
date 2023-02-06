import { Body, Controller, Get, HttpCode, NotFoundException, Param, Post, Req, UseGuards } from "@nestjs/common";
import { ChatService } from "./chat.service";
import JwtAuthGuard from "../../auth/guard/jwt-auth.guard";
import { IRequestWithUser } from "src/auth/auths.interface";
import { ChannelCreationDto } from "src/utils/dto/users.dto";

@UseGuards(JwtAuthGuard)
@Controller("chat")
export class ChatController {
    constructor(private readonly chatService: ChatService) {}

    @Post("channel")
    @HttpCode(205)
    async createChannel(@Req() request: IRequestWithUser, @Body() payload: ChannelCreationDto) {
        return await this.chatService.createChannel(request.user.username, payload);
    }
}
