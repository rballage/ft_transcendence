import { BadRequestException, HttpException, Injectable, NotFoundException } from '@nestjs/common';
import { UsersService } from 'src/users/users.service';
import * as sharp from 'sharp';
// import * as path from 'path';
import * as fs from 'fs';
import { Avatar } from '@prisma/client';
import { UserWhole } from 'src/users/types/users.types';
import { Readable } from 'stream';
import etag from 'etag';
import { PrismaService } from 'src/prisma.service';

@Injectable()
export class AvatarService {
	constructor(private readonly usersService:UsersService,
		private readonly prismaService:PrismaService) {}

	async getAvatar(username: string, size: string) : Promise<any>{
		const user: UserWhole = await this.usersService.getWholeUser(username);
		if (!user) throw new NotFoundException('User not found');
	
		if (!(size === 'large' || size === 'medium' || size === 'thumbnail' || size === 'original'))
			throw new BadRequestException('Invalid avatar size argument || no avatar found');
		
		let selectedAvatar = user?.avatars?.linkOriginal; // must change to default
		if (size === 'large') selectedAvatar = (user.avatars?.linkLarge) ?  user.avatars.linkLarge : '_default.large.webp';
		else if (size === 'medium') selectedAvatar = (user.avatars?.linkMedium) ?  user.avatars.linkMedium : '_default.medium.webp';
		else if (size === 'thumbnail') selectedAvatar = (user.avatars?.linkThumbnail) ? user.avatars.linkThumbnail : '_default.thumbnail.webp';
		else if (size === 'original') selectedAvatar = (user.avatars?.linkOriginal) ?  user.avatars.linkOriginal : '_default.original.webp';
		fs.accessSync(selectedAvatar, fs.constants.F_OK | fs.constants.R_OK);
		const file = fs.createReadStream(selectedAvatar);
		return {
			stream: file,
			filename: selectedAvatar,
			tag: (user.avatars?.updatedAt ? String(new Date(user.avatars.updatedAt).getTime()) + selectedAvatar : selectedAvatar)};
	}

	async deleteAvatar(username: string) : Promise<any>{
		const avatar: Avatar = await this.prismaService.avatar.findUnique({where : {username : username}});
		if (!avatar || avatar.linkOriginal == '_default.original.webp' || avatar.linkMedium == '_default.medium.webp')
		    return true;
		const avatarArr : string [] = [avatar.linkOriginal, avatar.linkLarge, avatar.linkMedium, avatar.linkThumbnail];
		avatarArr.forEach((value : string) => {
			console.log('Deleting: ', value)
			try {
				fs.unlinkSync(value);
			} catch (error) {
				console.log(error)
			}
		})
		return await this.prismaService.avatar.update({where : {username : username},
		    data : {
                linkOriginal : '_default.original.webp',
			    linkLarge : '_default.large.webp',
			    linkMedium : '_default.medium.webp',
			    linkThumbnail : '_default.thumbnail.webp'}});
	}

	async cropToSquareIfNecessary(originalFile : string) : Promise<any>
	{
		const metadata = await sharp(originalFile).metadata();
		if (metadata.width == metadata.height)
            return fs.createReadStream(originalFile);
		if (metadata.width < metadata.height)
		{
			const paddingTop : number = Math.round(metadata.height / 2 - metadata.width / 2);
			return await sharp(originalFile).extract({
				left: 0,
				top: paddingTop,
				width: metadata.width,
				height: metadata.width
			}).toBuffer();
		}
		else {
			const paddingLeft : number = Math.round(metadata.width / 2 - metadata.height / 2);
            return await sharp(originalFile).extract({
                left: paddingLeft,
                top: 0,
                width: metadata.height,
				height: metadata.height
			}).toBuffer();
		}
	}
	
	async convertAvatar(avatarObject : any, avatarDbEntry: Avatar) : Promise<any>{
		let cropped;
		try {
			cropped = await this.cropToSquareIfNecessary(avatarDbEntry.linkOriginal);
		}
		catch (e)
		{
			// console.log("CACA")
			try {
				fs.unlinkSync(avatarDbEntry.linkOriginal);
			} catch (e) {
				console.log(e);
			}
			throw new HttpException('bad file type', 422)
		}
		const OriginalFileStream = Readable.from(cropped);
		// const OriginalFileStream : fs.ReadStream = fs.createReadStream(avatarDbEntry.linkOriginal);
		const sharpStream = sharp({ failOn: 'none' });
		const OutputAvatarOriginalPath = `${avatarObject.destination}/${avatarDbEntry.username}.original.webp`
		const OutputAvatarLargePath = `${avatarObject.destination}/${avatarDbEntry.username}.large.webp`
		const OutputAvatarMediumPath = `${avatarObject.destination}/${avatarDbEntry.username}.medium.webp`
		const OutputAvatarthumbnailPath = `${avatarObject.destination}/${avatarDbEntry.username}.thumbnail.webp`
		const promises = [];

		promises.push(sharpStream.clone().resize({ width: 1000 }).webp({ quality: 100 })
			.toFile(OutputAvatarOriginalPath));
		promises.push(sharpStream.clone().resize({ width: 500 }).webp({ quality: 30 })
			.toFile(OutputAvatarLargePath));
		promises.push(sharpStream.clone().resize({ width: 250 }).webp({ quality: 30 })
			.toFile(OutputAvatarMediumPath));
		promises.push(sharpStream.clone().resize({ width: 100 }).webp({ quality: 30 })
			.toFile(OutputAvatarthumbnailPath));

		OriginalFileStream.pipe(sharpStream);

		return await Promise.all(promises)
		.then(async function (res) {
			fs.unlinkSync(avatarDbEntry.linkOriginal);
			avatarDbEntry.linkThumbnail = OutputAvatarthumbnailPath;
			avatarDbEntry.linkMedium = OutputAvatarMediumPath;
			avatarDbEntry.linkLarge = OutputAvatarLargePath;
			avatarDbEntry.linkOriginal = OutputAvatarOriginalPath;
			return {
					id : avatarDbEntry.id,
					linkOriginal: OutputAvatarOriginalPath,
					linkLarge: OutputAvatarLargePath,
					linkMedium: OutputAvatarMediumPath,
					linkThumbnail: OutputAvatarthumbnailPath
			}
		})
		.catch(err => {
			console.error("Error processing files, cleaning", err);
			try {
				fs.unlinkSync(OutputAvatarOriginalPath);
				fs.unlinkSync(OutputAvatarLargePath);
				fs.unlinkSync(OutputAvatarMediumPath);
				fs.unlinkSync(OutputAvatarthumbnailPath);
			} catch (e) {
				err.log(e);
			}
		});
	}
	
}
