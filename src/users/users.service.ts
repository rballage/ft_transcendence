import { Injectable } from '@nestjs/common';
import { User } from '@prisma/client';

import { PrismaService } from 'src/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
// import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
	constructor(private prismaService:PrismaService) {}
	
	async createUser(createUserDto: CreateUserDto) : Promise<User> {
		const user = await this.prismaService.user.create({data: {...createUserDto}})
		return user;
	}
	async upUser(createUserDto: CreateUserDto) : Promise<User> {
		const user = await this.prismaService.user.create({data: {...createUserDto}})
		return user;
	}

	async getUser(name : string) : Promise<User> {
		const user = await this.prismaService.user.findUnique({ where: { username: name } });
		return user;
	}

	async getProfile(name : string) : Promise<any> {
		const user = await this.prismaService.user.findUnique(
			{
				where: { username: name },
				select: {
					username: true,
					avatar_large: true,
					gameHistoryPOne: {
						select: {
							finishedAt: true,
							startedAt: true,
							score_playerOne: true,
							score_playerTwo: true,
							playerOne: {
								select: {
									username: true,
									avatar_thumbnail: true,
								}
							},
							playerTwo: {
								select: {
									username: true,
									avatar_thumbnail: true,
								}
							},
							id: true,
						}
					},
					gameHistoryPTwo: {
						select: {
							finishedAt: true,
							startedAt: true,
							score_playerOne: true,
							score_playerTwo: true,
							playerOne: {
								select: {
									username: true,
									avatar_thumbnail: true,
								}
							},
							playerTwo: {
								select: {
									username: true,
									avatar_thumbnail: true,
								}
							},
							id: true,
						},
					},
				}
			});
		return user;
	}

	// async updateUser(name : String) : Promise<User> {
	// 	const user = await this.prismaService.user.findUnique({ where: { name } });
	// 	return user;
	// }
}
