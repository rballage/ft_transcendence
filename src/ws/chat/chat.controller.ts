import { Body, Controller, Get, HttpCode, NotFoundException, Param, Patch, Post, Req, UseGuards } from "@nestjs/common";
import { ChatService } from "./chat.service";
import JwtAuthGuard from "../../auth/guard/jwt-auth.guard";
import { IRequestWithUser } from "src/auth/auths.interface";
import { ChannelCreationDto, UserStateDTO } from "src/utils/dto/users.dto";
import { UsersService } from "src/users/users.service";
import { eSubscriptionState } from "@prisma/client";

@UseGuards(JwtAuthGuard)
@Controller("chat")
export class ChatController {
    constructor(private readonly chatService: ChatService) {}

    @Post("channel")
    @HttpCode(205)
    async createChannel(@Req() request: IRequestWithUser, @Body() payload: ChannelCreationDto) {
        return this.chatService.createChannel(request.user.username, payload);
    }

    @Get(":channelId/:username/state/reset")
    async resetUserStateFromChannel(@Req() request: IRequestWithUser, @Param("channelId") channelId: string, @Param("username") userTo: string) {
        return this.chatService.alterUserStateInChannel(channelId, request.user.username, userTo, {
            stateTo: eSubscriptionState.OK,
            duration: null,
        });
    }

    @Post(":channelId/:username/state")
    async setUserStateFromChannel(@Req() request: IRequestWithUser, @Body() stateDTO: UserStateDTO, @Param("channelId") channelId: string, @Param("username") userTo: string) {
        return this.chatService.alterUserStateInChannel(channelId, request.user.username, userTo, stateDTO);
    }

    // @Patch(":channelId/users")
    // async setUsersInChannel(@Req() request: IRequestWithUser, @Param("channelId") channelId: string, @Body() payload: ChannelCreationDto) {
    //     const userFrom = request.user.username;
    //     return await this.chatService.setUsersInChannel(request.user, channelId, payload.usernames);
    // }
}
