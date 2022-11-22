import { isAlphanumeric, isEmail, isNotEmpty } from "class-validator";


export class CreateUserDto {
	public name: string;
	
	public email: string;

	public password: string;
}
