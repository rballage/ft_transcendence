import { eChannelType } from "@prisma/client";
import { Transform, Type } from "class-transformer";
import {
    IsAlphanumeric,
    IsNotEmpty,
    IsEmail,
    IsOptional,
    MinLength,
    MaxLength,
    IsNumber,
    IsPositive,
    Min,
    Max,
    IsIn,
    IsBoolean,
    IsArray,
    ValidateNested,
    ArrayMinSize,
    ArrayMaxSize,
} from "class-validator";

export class updateUsernameDto {
    @IsNotEmpty()
    @IsAlphanumeric()
    @MinLength(3)
    @MaxLength(12)
    username: string;
}
export class UsernameDto {
    @IsNotEmpty()
    @IsAlphanumeric()
    @MinLength(3)
    @MaxLength(12)
    username: string;
}

export class ChannelCreationDto {
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @ArrayMinSize(0)
    @ArrayMaxSize(200)
    @Type(() => UsernameDto)
    usernames: UsernameDto[];

    @IsNotEmpty()
    @IsAlphanumeric()
    @MinLength(3)
    @MaxLength(18)
    name: string;

    channel_type: eChannelType;

    @IsOptional()
    @MinLength(8)
    @MaxLength(42)
    password: string;
}
export class CreateUserDto {
    @IsNotEmpty()
    @IsAlphanumeric()
    @MinLength(3)
    @MaxLength(12)
    username: string;

    @IsNotEmpty()
    @IsEmail()
    @IsOptional()
    email: string;

    @IsNotEmpty()
    @MinLength(8)
    @MaxLength(42)
    password: string;
}

export class UpdateUserDto {
    @IsNotEmpty()
    @IsAlphanumeric()
    @MinLength(3)
    @MaxLength(12)
    @IsOptional()
    username: string;

    @IsNotEmpty()
    @IsEmail()
    @IsOptional()
    email: string;

    @IsNotEmpty()
    @MinLength(8)
    @MaxLength(42)
    @IsOptional()
    password: string;
}
export class QuerySearchUserDto {
    @IsNotEmpty()
    @IsAlphanumeric()
    @MaxLength(42)
    readonly key: string;
    @IsOptional()
    @IsNumber()
    @Min(0)
    readonly skip: number = 0;
    @IsOptional()
    @IsNumber()
    @IsPositive()
    @Min(1)
    @Max(40)
    readonly take: number = 20;
}

const sortings = ["asc", "desc"] as const;
export type Sortings = (typeof sortings)[number];

export class QueryGetGamesDto {
    @IsNotEmpty()
    @IsAlphanumeric()
    @MaxLength(4)
    @IsIn(sortings)
    readonly order: Sortings;

    @IsOptional()
    @IsNumber()
    @Min(0)
    readonly skip: number = 0;

    @IsOptional()
    @IsNumber()
    @IsPositive()
    @Min(1)
    @Max(40)
    readonly take: number = 20;
}
export class ParamUsernameDto {
    @IsNotEmpty()
    @IsAlphanumeric()
    @MaxLength(42)
    readonly username: string;
}

export class QueryToggle2FADto {
    @IsNotEmpty()
    @IsBoolean()
    @Transform(({ obj, key }) => obj[key] === "true")
    readonly toggle: boolean;
}
// export class QuerySkipDto {

// }
// export class QueryTakeDto {

// }
