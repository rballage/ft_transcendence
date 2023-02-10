import { Body, Controller, Get, HttpCode, NotFoundException, Param, Post, Req, UseGuards } from "@nestjs/common";
import { ChatService } from "./chat.service";
import JwtAuthGuard from "../../auth/guard/jwt-auth.guard";
import { IRequestWithUser } from "src/auth/auths.interface";
import { ChannelCreationDto, userStateDTO } from "src/utils/dto/users.dto";
import { UsersService } from "src/users/users.service";

@UseGuards(JwtAuthGuard)
@Controller("chat")
export class ChatController {
    constructor(private readonly chatService: ChatService) {}

    @Post("channel")
    @HttpCode(205)
    async createChannel(@Req() request: IRequestWithUser, @Body() payload: ChannelCreationDto) {
        return await this.chatService.createChannel(request.user.username, payload);
    }

    @Post(":channelId/:username/state")
    async setUserStateFromChannel(
        @Body() stateDTO: userStateDTO,
        @Req() request: IRequestWithUser,
        @Param("channelId") channelId: string,
        @Param("username") userTo: string) {
        const userFrom = request.user.username
        return await this.chatService.setUserStateFromChannel(channelId, userFrom, userTo, stateDTO)
    }
}
