import { BadRequestException, Controller, Delete, Get, Header, HttpCode, NotFoundException, Param, Post, Req, Res, StreamableFile, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { IRequestWithUser } from "src/auth/auths.interface";
import JwtAuthGuard from "src/auth/guard/jwt-auth.guard";
import { JwtRefreshGuard } from "src/auth/guard/jwt-refresh-auth.guard";
import { AvatarService } from "./avatar.service";
import { FileInterceptor } from "@nestjs/platform-express";
import { Express, Response } from "express";
import { saveAvatarToStorage } from "../utils/helpers/avatar-storage";
import { PrismaService } from "src/prisma.service";

// @UseGuards(JwtAuthGuard)
@Controller("avatar")
export class AvatarController {
    constructor(private readonly prismaService: PrismaService, private readonly avatarService: AvatarService) {}

    @UseGuards(JwtRefreshGuard)
    // @UseFilters(RedirectAuthFilter)
    @Post("")
    @HttpCode(205)
    @UseInterceptors(FileInterceptor("avatar", saveAvatarToStorage))
    async uploadAvatar(@UploadedFile() avatar: Express.Multer.File, @Req() request: IRequestWithUser) {
        if (request.fileValidationError) throw new BadRequestException(request.fileValidationError);
        else if (!avatar) throw new BadRequestException("invalid file");
        const resFromDb = await this.prismaService.addAvatar(request.user.username, avatar.path); // undefined for testing, change to username !
        const ret = await this.avatarService.convertAvatar(avatar, resFromDb);
        return await this.prismaService.avatar.update({ where: { id: ret.id }, data: { ...ret } });
    }

    // @UseGuards(JwtAuthGuard)
    // @UseFilters(RedirectAuthFilter)
    @Get(":username/:size")
    @Header("Content-Type", "image/webp")
    async getAvatar(@Req() request: Request, @Param("username") username: string, @Param("size") size: string, @Res({ passthrough: true }) response: Response) {
        try {
            const avatar = await this.avatarService.getAvatar(username, size);
            response.set({
                "Content-Disposition": `inline; filename="${avatar.filename}"`,
                "Content-Type": "image/webp",
                ETag: avatar.tag,
            });
            if (request.headers["if-none-match"] === avatar.tag) {
                response.status(304);
                return;
            }
            return new StreamableFile(avatar.stream);
        } catch (e) {
            throw new NotFoundException("avatar not found");
        }
    }
    @UseGuards(JwtAuthGuard)
    @Delete("")
    @HttpCode(205)
    async deleteAvatar(@Req() request: IRequestWithUser) {
        return await this.avatarService.deleteAvatar(request.user.username);
    }
}
