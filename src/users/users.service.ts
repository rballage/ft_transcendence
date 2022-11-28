import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { User } from '@prisma/client';
import { PrismaService } from 'src/prisma.service';
import { CreateUserDto } from './dto/users.dto';
import { UserProfile, userProfileQuery } from './types/users.types';
import * as bcrypt from 'bcrypt';


@Injectable()
export class UsersService {
	constructor(private prismaService:PrismaService) {}

	async createUser(userDto: CreateUserDto) : Promise<User> {
		try {
			const user = await this.prismaService.user.create({data: userDto})
			return user;
		}
		catch(error) {
			throw new BadRequestException("User already exists");
		}
	}

	async getUser(name : string) : Promise<User> {
		try {
			const user = await this.prismaService.user.findUnique({ where: { username: name } });
			// if (user)
				return user;
		}
		catch(error) {
            throw new NotFoundException("User not found");}
		// throw new NotFoundException("user not found")
	}

	async getProfile(name : string) : Promise<UserProfile> {
		const user = await this.prismaService.user.findUnique(
			{
				where: { username: name },
				...userProfileQuery
			});
		return user;
	}

	async setRefreshToken(refreshToken: string, name: string) {
		const HashedRefreshToken = await bcrypt.hash(refreshToken, 10);
		await this.prismaService.user.update({
  			where: { username: name },
 			data: { refresh_token: HashedRefreshToken },
		});
	}

	async setNewPassword(newpassword: string, name: string) {
		const Hashednewpassword = await bcrypt.hash(newpassword, 10);
		await this.prismaService.user.update({
  			where: { username: name },
 			data: { password: Hashednewpassword },
		});
	}

	async getUserIfRefreshTokenMatches(refreshToken: string, name: string) {
    	const user = await this.getUser(name);
    	const res = await bcrypt.compare(refreshToken, user.refresh_token);
		if (res) {
			return user;
		}
	}
	async deleteRefreshToken(name : string) {
		await this.prismaService.user.update(
						{
				where: { username: name },
				data: { refresh_token: null }
			});
	}

}
