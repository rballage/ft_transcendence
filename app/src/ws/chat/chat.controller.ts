import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Req, UseGuards } from "@nestjs/common";
import { ChatService } from "./chat.service";
import JwtAuthGuard from "../../auth/guard/jwt-auth.guard";
import { IRequestWithUser } from "src/auth/auths.interface";
import { ChannelCreationDto, ChannelSettingsDto, UserStateDTO, IdDto, UsernameDto } from "src/utils/dto/users.dto";
import { State } from "@prisma/client";
import { JoinRequestDto, NewMessageDto } from "src/utils/dto/ws.input.dto";

@UseGuards(JwtAuthGuard)
@Controller("chat")
export class ChatController {
    constructor(private readonly chatService: ChatService) {}

    @Post("channel")
    @HttpCode(205)
    async createChannel(@Req() request: IRequestWithUser, @Body() payload: ChannelCreationDto) {
        return this.chatService.createChannel(request.user.username, payload);
    }

    @Get(":id")
    async get(@Req() request: IRequestWithUser, @Param() channelId: IdDto) {
        return this.chatService.channelExist(channelId.id);
    }

    @Get(":id/:username/state/reset")
    async resetUserStateFromChannel(@Req() request: IRequestWithUser, @Param() channelId: IdDto, @Param() userTo: UsernameDto) {
        return this.chatService.alterUserStateInChannel(channelId.id, request.user.username, userTo.username, {
            stateTo: State.OK,
            duration: null,
        });
    }
    @Post(":id/:username/state")
    async setUserStateFromChannel(@Req() request: IRequestWithUser, @Body() stateDTO: UserStateDTO, @Param() channelId: IdDto, @Param() userTo: UsernameDto) {
        return this.chatService.alterUserStateInChannel(channelId.id, request.user.username, userTo.username, stateDTO);
    }

    @Patch(":id/settings")
    @HttpCode(205)
    async alterChannelSettings(@Req() request: IRequestWithUser, @Body() settings: ChannelSettingsDto, @Param() channelId: IdDto) {
        return this.chatService.alterChannelSettings(channelId.id, request.user.username, settings);
    }
    @Post(":id/message")
    async newMessage(@Req() request: IRequestWithUser, @Body() message: NewMessageDto, @Param() channelId: IdDto) {
        return this.chatService.newMessage(request.user, channelId.id, message);
    }
    @Post(":id/join")
    async joinChannelHttp(@Req() request: IRequestWithUser, @Body() joinRequest: JoinRequestDto, @Param() dto: IdDto) {
        return this.chatService.joinChannelHttp(request.user, dto.id, joinRequest);
    }
    @Patch("leave")
    async leaveChannelHttp(@Req() request: IRequestWithUser, @Body() joinRequest: JoinRequestDto) {
        return this.chatService.leaveChannelHttp(request.user.username, joinRequest);
    }

    @Delete(":id")
    @HttpCode(205)
    async deleteChannelSubscriptionHttp(@Req() request: IRequestWithUser, @Param() channelId: IdDto) {
        return this.chatService.deleteChannelSubscriptionHttp(request.user, channelId.id);
    }
}
