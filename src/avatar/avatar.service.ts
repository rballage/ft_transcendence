import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { UsersService } from 'src/users/users.service';
import * as sharp from 'sharp';
// import * as path from 'path';
import * as fs from 'fs';
import { Avatar } from '@prisma/client';

@Injectable()
export class AvatarService {
	constructor(private readonly prismaService:PrismaService,
				private readonly usersService:UsersService) {}
	async convertAvatar(avatarObject : any, avatarDbEntry: Avatar) : Promise<any>{
		const OriginalFileStream = fs.createReadStream(avatarDbEntry.linkOriginal);
		const sharpStream = sharp({ failOn: 'none' });
		const OutputAvatarOriginalPath = `${avatarObject.destination}/${avatarDbEntry.username}.original.webp`
		const OutputAvatarLargePath = `${avatarObject.destination}/${avatarDbEntry.username}.large.webp`
		const OutputAvatarMediumPath = `${avatarObject.destination}/${avatarDbEntry.username}.medium.webp`
		const OutputAvatarthumbnailPath = `${avatarObject.destination}/${avatarDbEntry.username}.thumbnail.webp`
		const promises = [];

		promises.push(sharpStream.clone().webp({ quality: 100 })
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
			console.log("Done!", res);
			return {
					id : avatarDbEntry.id,
					linkOriginal: OutputAvatarOriginalPath,
					linkLarge: OutputAvatarLargePath,
					linkMedium: OutputAvatarMediumPath,
					linkThumbnail: OutputAvatarthumbnailPath
			}
			// delete avatarDbEntry.id;

		})
		.catch(err => {
			console.error("Error processing files, let's clean it up", err);
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
