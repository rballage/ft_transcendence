import { eRole, Message, eChannelType, eSubscriptionState } from "@prisma/client";

export type Role = 'USER' | 'ADMIN' | 'OWNER';

export type Message_dto = {
	id: string;
	channel_id: string;
    timestamp: string;
    content: string;
};

export type Info_dto = {
	channel_id: string;
    content: object;
	status: number;
};

export type Error_dto = {
	channel_id: string;
    content: object;
	status: number;
};

export type UserInfo = {
	username: string;
	role: eRole;
}

export type join_channel_output = { // this is sent to the client when a channel is joined or when an update to the client is needed
	status: 'OK' | 'error';
	message?: string;
	data: {
		channelId?: string;
		name?: string;
		channel_type?: eChannelType;
		state?: eSubscriptionState
		stateActiveUntil?: Date;
		messages?: Message[];
		role?: eRole;
		SubscribedUsers?: UserInfo[];
		username?: string;
	};
}