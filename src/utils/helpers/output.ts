import { UserWhole, UserWholeOutput } from "../types/users.types";

export function toUserWholeOutput(user: UserWhole): UserWholeOutput {
    delete user.password;
    delete user.avatars;
    delete user.refresh_token;
    delete user.TwoFASecret;
    delete user.auth42;
    delete user.auth42Id;
    delete user.blockedBy;
    return user as UserWholeOutput;
}
