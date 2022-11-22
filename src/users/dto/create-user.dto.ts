import { isAlphanumeric, isEmail, isNotEmpty } from "class-validator";


export class CreateUserDto {
	public username: string;
	
	public email: string;

	public password: string;
}
