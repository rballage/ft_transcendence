import { BadRequestException, Controller, Post, Req, UploadedFile, UploadedFiles, UseGuards, UseInterceptors } from '@nestjs/common';
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
		if (!avatar)
			throw new BadRequestException("invalid file");
		else return true;
		//TODO
		// save this file path to database as : user.avatar.linkOriginal
		// convert file to jpg
		// create new async process which will convert original file to jpg format if needed, 
			// then resize the original to 3 fixed sized images:
				// 1. large: 500x500px
				// 2. medium: 250x250px
                // 3. thumbnail: 100x100px
		// console.log(avatar);
	}

}
