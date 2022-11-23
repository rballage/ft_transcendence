import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { User } from '@prisma/client';
import * as bcrypt from 'bcrypt';


import { PrismaService } from 'src/prisma.service';
import { CreateUserDto, UpdateUserDto } from './dto/users.dto';
import { UserProfile, userProfileQuery } from './types/users.types';
// import { UpdateUserDto } from './dto/update-user.dto';

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
	}}

	async updateUser(userDto: UpdateUserDto) : Promise<User> {
		const user = await this.prismaService.user.update({data: userDto})
		return user;
	}

	async getUser(name : string) : Promise<User> {
		const user = await this.prismaService.user.findUnique({ where: { username: name } });
		if (user)
			return user;
		throw new NotFoundException("user not found")
	}

	async getProfile(name : string) : Promise<UserProfile> {
		const user = await this.prismaService.user.findUnique(
			{
				where: { username: name },
				...userProfileQuery
			});
		return user;
	}
	
	async hash(password : string) : Promise<String> {
		const hash_password = await bcrypt.hash(password, 10);
		return hash_password;
	}

	// async updateUser(name : String) : Promise<User> {
	// 	const user = await this.prismaService.user.findUnique({ where: { name } });
	// 	return user;
	// }
}
