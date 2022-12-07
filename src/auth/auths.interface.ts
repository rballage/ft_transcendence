import { User } from "@prisma/client";

export interface IRequestWithUser extends Request {
  fileValidationError: any;
  user: User;
}

export interface ITokenPayload {
  username: string;
}
