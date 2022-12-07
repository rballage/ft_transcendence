import { BadRequestException, Controller, Post, Req, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { IRequestWithUser } from 'src/auth/auths.interface';
import JwtAuthGuard from 'src/auth/guard/jwt-auth.guard';
import { AvatarService } from './avatar.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { Express } from 'express';
import { saveAvatarToStorage } from './helpers/avatar-storage';
import { UsersService } from 'src/users/users.service';

// @UseGuards(JwtAuthGuard)
@Controller('avatar')
export class AvatarController {
	constructor(private readonly avatarService: AvatarService,
				private readonly usersService : UsersService) {}

	// @UseGuards(JwtAuthGuard)
	@Post('upload')
	@UseInterceptors(FileInterceptor('avatar', saveAvatarToStorage))
	async uploadAvatar(@UploadedFile() avatar : Express.Multer.File, @Req() request: IRequestWithUser) {
		if (request.fileValidationError) throw new BadRequestException(request.fileValidationError);
        else if (!avatar) throw new BadRequestException('invalid file');
		const resFromDb = await this.usersService.addAvatar(undefined, avatar.path); // undefined for testing, change to username !
		await this.avatarService.convertAvatar(avatar, resFromDb);
		//TODO
		// save this file path to database as : user.avatar.linkOriginal / -> OK
		// create new async process which will convert original file to jpg format if needed, 
		// then resize the original to 3 fixed sized images:
		// 1. large: 500x500px
		// 2. medium: 250x250px
		// 3. thumbnail: 100x100px
		return {message: 'file has been uploaded', filename: avatar.filename};
	}
	
}
