import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { UsersService } from 'src/users/users.service';
import * as sharp from 'sharp';
import * as path from 'path';
import * as fs from 'fs';
import { Avatar } from '@prisma/client';

const thumbnailOptions = {
	width: 100,
    height: 100,
    quality: 30,

}
@Injectable()
export class AvatarService {
	constructor(private prismaService:PrismaService,
				private usersService:UsersService) {}
	async convertAvatar(avatarObject : any, avatarDbEntry: Avatar) {
		// console.log('avatar Db Entry:', avatarDbEntry);
		// console.log('avatar Object:', avatarObject);
		const output_filename_original = path.parse(avatarObject.filename).name;
		const OriginalFileStream = fs.createReadStream(avatarDbEntry.linkOriginal);
		const sharpStream = sharp({ failOn: 'none' });
		const promises = [];

		promises.push(sharpStream.clone().webp({ quality: 100 })
			.toFile(`${avatarObject.destination}/${avatarDbEntry.username}.original.webp`));
		promises.push(sharpStream.clone().resize({ width: 500 }).webp({ quality: 50 })
			.toFile(`${avatarObject.destination}/${avatarDbEntry.username}.large.webp`));
		promises.push(sharpStream.clone().resize({ width: 250 }).webp({ quality: 50 })
			.toFile(`${avatarObject.destination}/${avatarDbEntry.username}.medium.webp`));
		promises.push(sharpStream.clone().resize({ width: 100 }).webp({ quality: 30 })
			.toFile(`${avatarObject.destination}/${avatarDbEntry.username}.thumbnail.webp`));

		OriginalFileStream.pipe(sharpStream);

		Promise.all(promises)
		.then(res => { console.log("Done!", res); })
		.catch(err => {
			console.error("Error processing files, let's clean it up", err);
			try {
				fs.unlinkSync(`${avatarObject.destination}/${avatarDbEntry.username}.original.webp`);
				fs.unlinkSync(`${avatarObject.destination}/${avatarDbEntry.username}.large.webp`);
				fs.unlinkSync(`${avatarObject.destination}/${avatarDbEntry.username}.medium.webp`);
				fs.unlinkSync(`${avatarObject.destination}/${avatarDbEntry.username}.thumbnail.webp`);
			} catch (e) {
				err.log(e);
			}
		});
	}
	
}
