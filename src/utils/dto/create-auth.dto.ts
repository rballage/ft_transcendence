import { IsString } from "class-validator";

export class CreateAuthDto {}

export class TwoFaAuthDto {
    @IsString()
    code: string;
}
