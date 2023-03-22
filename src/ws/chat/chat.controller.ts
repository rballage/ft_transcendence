import { Body, Controller, Delete, Get, HttpCode, NotFoundException, Param, Patch, Post, Req, UseGuards } from "@nestjs/common";
import { ChatService } from "./chat.service";
import JwtAuthGuard from "../../auth/guard/jwt-auth.guard";
import { IRequestWithUser } from "src/auth/auths.interface";
import { ChannelCreationDto, ChannelSettingsDto, UserStateDTO, IdDto, UsernameDto } from "src/utils/dto/users.dto";
import { UsersService } from "src/users/users.service";
import { State } from "@prisma/client";
import { JoinRequestDto, NewMessageDto, ReceivedJoinRequest } from "src/utils/dto/ws.input.dto";

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
    async resetUserStateFromChannel(@Req() request: IRequestWithUser, @Param("channelId") channelId: IdDto, @Param("username") userTo: UsernameDto) {
        return this.chatService.alterUserStateInChannel(channelId.id, request.user.username, userTo.username, {
            stateTo: State.OK,
            duration: null,
        });
    }
    @Post(":channelId/:username/state")
    async setUserStateFromChannel(@Req() request: IRequestWithUser, @Body() stateDTO: UserStateDTO, @Param("channelId") channelId: IdDto, @Param("username") userTo: UsernameDto) {
        return this.chatService.alterUserStateInChannel(channelId.id, request.user.username, userTo.username, stateDTO);
    }

    @Patch(":channelId/settings")
    @HttpCode(205)
    async alterChannelSettings(@Req() request: IRequestWithUser, @Body() settings: ChannelSettingsDto, @Param("channelId") channelId: IdDto) {
        return this.chatService.alterChannelSettings(channelId.id, request.user.username, settings);
    }
    @Post(":channelId/message")
    async newMessage(@Req() request: IRequestWithUser, @Body() message: NewMessageDto, @Param("channelId") channelId: IdDto) {
        return this.chatService.newMessage(request.user, channelId.id, message);
    }
    @Post(":channelId/join")
    async joinChannelHttp(@Req() request: IRequestWithUser, @Body() joinRequest: JoinRequestDto, @Param("channelId") channelId: IdDto) {
        return this.chatService.joinChannelHttp(request.user, channelId.id, joinRequest);
    }
    @Patch("leave")
    async leaveChannelHttp(@Req() request: IRequestWithUser, @Body() joinRequest: JoinRequestDto) {
        return this.chatService.leaveChannelHttp(request.user.username, joinRequest);
    }

    @Delete(":channelId")
    @HttpCode(205)
    async deleteChannelSubscriptionHttp(@Req() request: IRequestWithUser, @Param("channelId") channelId: IdDto) {
        return this.chatService.deleteChannelSubscriptionHttp(request.user, channelId.id);
    }
}
