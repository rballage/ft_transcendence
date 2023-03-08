import { UserWhole } from "src/utils/types/users.types";

export interface IRequestWithUser extends Request {
    fileValidationError: any;
    user: UserWhole;
}

export interface ITokenPayload {
    email: string;
    TwoFA: boolean;
    TwoFAAuthenticated: boolean;
}
