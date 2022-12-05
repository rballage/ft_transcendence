import { diskStorage } from 'multer';
import { Controller, Post, Req, UploadedFile, UploadedFiles, UseGuards, UseInterceptors } from '@nestjs/common';

import { IRequestWithUser } from 'src/auth/auths.interface';
import {v4 as uuid } from 'uuid';
const fs = require('fs')
// const FileType = require('file-type')
const path = require('path')

type validFileExtension = 'png' | 'jpeg' | 'jpg';
type validMimeType = 'image/png' | 'image/jpeg' | 'image/jpg';

const validFileExtensions: validFileExtension[] = ['png' , 'jpeg' , 'jpg'];
const validMimeTypes: validMimeType[] = ['image/png' , 'image/jpeg' , 'image/jpg'];

export const saveAvatarToStorage = {
	storage: diskStorage({
		destination: './images',
		filename: function (request: any, file, callback) {
			console.log(file);
			const fileExtension: validFileExtension = path.extname(file.originalname);
			const fileName: string = request?.user?.username + '.orginal' + fileExtension;
			const id : string = uuid();
			callback(null, fileName);
		}
	}),
	filter: function (request, file, callback) {
		const allowedMimeTypes : validMimeType[] = validMimeTypes;
		if (allowedMimeTypes.includes(file.mimetype))
		    callback(null, true);
        else
		    callback(null, false);
	},
	// limits: function (request, file, callback) {
	// 	if (file.fileSize > 2048)
	// 	    callback(null, false);
    //     else
	// 	    callback(null, true);
	// }
}