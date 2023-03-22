import { MulterOptions } from "@nestjs/platform-express/multer/interfaces/multer-options.interface";
import { Request } from "express";
import * as multer from "multer";
import * as path from "path";
import { IRequestWithUser } from "src/auth/auths.interface";

type validFileExtension = "png" | "jpeg" | "jpg";
type validMimeType = "image/png" | "image/jpeg" | "image/jpg";

const validFileExtensions: validFileExtension[] = ["png", "jpeg", "jpg"];
const validMimeTypes: validMimeType[] = ["image/png", "image/jpeg", "image/jpg"];

export const saveAvatarToStorage: MulterOptions = {
    limits: { fileSize: 2048 * 1000 },
    storage: multer.diskStorage({
        destination: "./images",
        filename: function (request: IRequestWithUser & Request, file: Express.Multer.File, callback) {
            // console.log(file);
            // file.
            const fileExtension: string = path.extname(file.originalname);
            const fileName: string = request?.user?.username + ".orginal" + fileExtension;
            callback(null, fileName);
        },
    }),
    fileFilter: function (request, file, callback) {
        const allowedFileExtension: any[] = validFileExtensions;
        const allowedMimeTypes: validMimeType[] = validMimeTypes;
        const fileExtension = path.extname(file.originalname);
        // console.log(fileExtension);
        // if (allowedFileExtension.includes(fileExtension as any) && allowedMimeTypes.includes(file.mimetype))
        if (1) {
            request.fileValidationError = null;
            callback(null, true);
        } else {
            request.fileValidationError = "unsupported mimetype and or bad file extension";
            callback(null, false);
        }
    },
};
