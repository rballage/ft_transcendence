import { Transform } from "class-transformer";
import { IsAlphanumeric, IsNotEmpty, IsEmail, IsOptional, MinLength, MaxLength, IsNumber, IsPositive, Min, Max, IsIn, IsBoolean, isDateString, IsDateString, IsUUID, isNumberString, IsObject } from "class-validator";


export class ReceivedMessage {
	@IsUUID()
	channel_id!: string;

	@IsNotEmpty()
	@IsDateString({ strict: true } as any)
	timestamp!: Date;

	@IsNotEmpty()
	@MinLength(1)
	@MaxLength(128)
	content!: string;
}

export class ReceivedInfos {
	@IsUUID()
	channel_id!: string;

	@IsNotEmpty()
	@IsPositive()
	@IsNumber()
	status!: number;

	@IsObject()
    content?: Object;
}

export class ReceivedJoinRequest {
	@IsUUID()
	channel_id!: string;
	@IsOptional()
	@IsUUID()
	last_received_message_id?: string;

	@IsOptional()
	@MinLength(8)
	@MaxLength(42)
	password?: string;
}

export class ReceivedLeaveRequest {
	@IsUUID()
	channel_id!: string;
}