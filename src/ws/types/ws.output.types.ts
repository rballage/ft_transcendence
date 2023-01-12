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
	role: Role;
}

export type join_channel_output = { // this is sent to the client when a channel is joined or when an update to the client is needed
	status: 'OK' | 'error';
	message: string;
	data: {
		channel_id?: string;
		name?: string;
		channel_type?: 'PUBLIC' | 'PRIVATE' | 'ONE_TO_ONE';
		state?: 'BANNED' | 'MUTED' | 'OK';
		stateActiveUntil?: Date;
		messages?: any[];
		role?: 'USER' | 'ADMIN' | 'OWNER';
		users?: UserInfo[];
		username?: string;
	};
}