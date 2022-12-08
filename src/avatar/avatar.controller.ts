import { BadRequestException, Controller, Get, Header, Param, Post, Req, Res, StreamableFile, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { IRequestWithUser } from 'src/auth/auths.interface';
import JwtAuthGuard from 'src/auth/guard/jwt-auth.guard';
import { AvatarService } from './avatar.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { Express } from 'express';
import { saveAvatarToStorage } from './helpers/avatar-storage';
import { UsersService } from 'src/users/users.service';
import { PrismaService } from 'src/prisma.service';

// @UseGuards(JwtAuthGuard)
@Controller('avatar')
export class AvatarController {
	constructor(private readonly avatarService: AvatarService,
				private readonly prismaService : PrismaService,
				private readonly usersService : UsersService) {}

	@UseGuards(JwtAuthGuard)
	@Post('')
	@UseInterceptors(FileInterceptor('avatar', saveAvatarToStorage))
	async uploadAvatar(@UploadedFile() avatar : Express.Multer.File, @Req() request: IRequestWithUser) {
		if (request.fileValidationError) throw new BadRequestException(request.fileValidationError);
        else if (!avatar) throw new BadRequestException('invalid file');
		const resFromDb = await this.usersService.addAvatar(undefined, avatar.path); // undefined for testing, change to username !
		const ret = await this.avatarService.convertAvatar(avatar, resFromDb);
		return await this.prismaService.avatar.update({where: { id : ret.id }, data: {...ret}})
		//TODO
		// save this file path to database as : user.avatar.linkOriginal / -> OK
		// create new async process which will convert original file to jpg format if needed, 
		// then resize the original to 3 fixed sized images:
		// 1. large: 500x500px
		// 2. medium: 250x250px
		// 3. thumbnail: 100x100px
	}

	// @UseGuards(JwtAuthGuard)
	@Get(':username/:size')
	@Header('Content-Type', 'image/webp')
	async getAvatar(
		@Req() request: IRequestWithUser,
		@Param('username') username:string,
		@Param('size') size:string,
		@Res({passthrough: true}) response: Response){
		if (username === 'me')
			username = request.user.username;
		const avatar = await this.avatarService.getAvatar(username, size);
		return new StreamableFile(avatar)
		// response.send(avatar)
	    // return new StreamableFile(avatar);
	}
}
