import { UserWhole, UserWholeOutput } from "../types/users.types";

export function toUserWholeOutput(user: UserWhole): UserWholeOutput {
    delete user.password;
    delete user.avatars;
    delete user.refresh_token;
    return user as UserWholeOutput;
}
