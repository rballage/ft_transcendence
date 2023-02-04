import { eRole, Message, eChannelType, eSubscriptionState } from "@prisma/client";

export type Role = "USER" | "ADMIN" | "OWNER";
export type MessageStatus = "OK" | "INVALID_PASSWORD" | "UNAUTHORIZED" | "MESSAGE_TOO_LONG" | "MESSAGE_TOO_SHORT" | "INVALID_TIMESTAMP" | "DATABASE_ERROR" | "INVALID_CHANNEL";

export type Message_output = {
    id: string;
    channelId: string;
    timestamp: Date;
    content: string;
    username: string;
};

export type Message_Aknowledgement_output = {
    status: MessageStatus;
    channelId: string;
    comment?: string;
};

export type Info_dto = {
    channelId: string;
    content: object;
    status: number;
};

export type Error_dto = {
    channelId: string;
    content: object;
    status: number;
};

export type UserInfo = {
    username: string;
    role: eRole;
};

export type join_channel_output = {
    // this is sent to the client when a channel is joined or when an update to the client is needed
    status: "OK" | "error";
    message?: string;
    data: {
        channelId?: string;
        name?: string;
        channel_type?: eChannelType;
        state?: eSubscriptionState;
        stateActiveUntil?: Date;
        messages?: Message[];
        role?: eRole;
        SubscribedUsers?: UserInfo[];
        username?: string;
    };
};
export type running_game = {
    gameId: string;
    finishedAt?: Date;
    startedAt: Date;
    score_playerOne?: number;
    score_playerTwo?: number;
    playerOneName: string;
    playerTwoName: string;
    map: string;
};
