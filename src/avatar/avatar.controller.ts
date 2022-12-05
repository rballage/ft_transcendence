import { Controller, Post, Req, UploadedFile, UploadedFiles, UseGuards, UseInterceptors } from '@nestjs/common';
import { diskStorage } from 'multer';
import { IRequestWithUser } from 'src/auth/auths.interface';
import JwtAuthGuard from 'src/auth/guard/jwt-auth.guard';
import { AvatarService } from './avatar.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { Express } from 'express';
import { saveAvatarToStorage } from './helpers/avatar-storage';

// @UseGuards(JwtAuthGuard)
@Controller('avatar')
export class AvatarController {
  constructor(private readonly avatarService: AvatarService) {}

	// @UseGuards(JwtAuthGuard)
	@Post('upload')
	@UseInterceptors(FileInterceptor('avatar', saveAvatarToStorage))
	async uploadAvatar(@UploadedFile() avatar : Express.Multer.File, @Req() request: IRequestWithUser) {
		// console.log(avatar);
	}

}
