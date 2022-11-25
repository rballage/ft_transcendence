import { BadRequestException, Injectable } from '@nestjs/common';
import { User } from '@prisma/client';
import { UsersService } from '../users/users.service';
import { CreateUserDto, UpdateUserDto } from '../users/dto/users.dto';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { ITokenPayload } from './auths.interface';
import * as dotenv from 'dotenv';
dotenv.config();


@Injectable()
export class AuthService {
	constructor(private readonly usersService:UsersService,
				private readonly jwtService: JwtService,
				) {}

	async register(userDto: CreateUserDto) : Promise<User> {
		userDto.password = await this.hashPassword(userDto.password);
		try {

			const user = await this.usersService.createUser(userDto)
			delete user.password;
			return user;
		}
		catch(error) {
			throw new BadRequestException("User already exists");
		}
	}

	public async getAuthenticatedUser(name: string, password: string) {
		console.log("getAuthenticatedUser");
		try {
			const user = await this.usersService.getUser(name);
			await this.checkPassword(user.password, password);
			delete user.password;
			return user;
		}
		catch (error) {
			throw new BadRequestException("Wrong Crededentials");
		}
  	}

	public async hashPassword(password : string) : Promise<string> {
		const hash_password = await bcrypt.hash(password, 10);
		return hash_password;
	}

	public async checkPassword(hash : string, password: string) : Promise<void> {
		console.log("password check:");
		
		const res = await bcrypt.compare(password, hash);
		console.log("password check:", res)
		if (!res) {
			throw new BadRequestException("Wrong Credentials");
		}
	}

	public getCookieWithJwtToken(username: string) {
    	const payload: ITokenPayload = { username };
    	const token = this.jwtService.sign(payload);
    	return `Authentication=${token}; HttpOnly; Path=/; Max-Age=${process.env.JWT_ACCESS_EXPIRATION_TIME}`;
  	}

	public getCookieForLogOut() {
    	return `Authentication=; HttpOnly; Path=/; Max-Age=0`;
  	}
}

// export class AuthenticationService {
//   constructor(
//     private readonly usersService: UsersService
//   ) {}
 
//   public async register(registrationData: RegisterDto) {
//     const hashedPassword = await bcrypt.hash(registrationData.password, 10);
//     try {
//       const createdUser = await this.usersService.create({
//         ...registrationData,
//         password: hashedPassword
//       });
//       createdUser.password = undefined;
//       return createdUser;
//     } catch (error) {
//       if (error?.code === PostgresErrorCode.UniqueViolation) {
//         throw new HttpException('User with that email already exists', HttpStatus.BAD_REQUEST);
//       }
//       throw new HttpException('Something went wrong', HttpStatus.INTERNAL_SERVER_ERROR);
//     }
//   }
//   // (...)
// }