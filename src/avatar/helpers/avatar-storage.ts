import { diskStorage } from 'multer';
// import { Controller, HttpException, Post, Req, UploadedFile, UploadedFiles, UseGuards, UseInterceptors } from '@nestjs/common';

// import { IRequestWithUser } from 'src/auth/auths.interface';
// import {v4 as uuid } from 'uuid';
import * as fs from 'fs';
// const fs = require('fs')
import * as path from 'path';
// const FileType = require('file-type')
// const path = require('path')

type validFileExtension = 'png' | 'jpeg' | 'jpg';
type validMimeType = 'image/png' | 'image/jpeg' | 'image/jpg';

const validFileExtensions: validFileExtension[] = ['png' , 'jpeg' , 'jpg'];
const validMimeTypes: validMimeType[] = ['image/png' , 'image/jpeg' , 'image/jpg'];

export const saveAvatarToStorage = {
	storage: diskStorage({
		destination: './images',
		filename: function (request: any, file, callback) {
			console.log(file);
			const fileExtension: string = path.extname(file.originalname);
			const fileName: string = request?.user?.username + '.orginal' + fileExtension;
			callback(null, fileName);
		}
	}),
	fileFilter: function (request, file, callback) {
		const allowedFileExtension: any[] = validFileExtensions;
		const allowedMimeTypes : validMimeType[] = validMimeTypes;
		const fileExtension = path.extname(file.originalname);
		console.log(fileExtension)
		// if (allowedFileExtension.includes(fileExtension as any) && allowedMimeTypes.includes(file.mimetype))
			callback(null, true);
        // else
		    // return callback(null, false);
	},
	limits: {fileSize: 2048 * 1000}
	// limits: function (request, file, callback) {
	// 	if (file.fileSize > 2048)
	// 	    callback(null, false);
    //     else
	// 	    callback(null, true);
	// }
}