import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { User } from '@prisma/client';

import { PrismaService } from 'src/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
// import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
	constructor(private prismaService:PrismaService) {}
	
	async createUser(userDto: CreateUserDto) : Promise<User> {
		try {
			const user = await this.prismaService.user.create({data: {...userDto}})
			return user;
		}
		catch(error) {
			throw new BadRequestException("User already exists");
	}}

	async updateUser(userDto: CreateUserDto) : Promise<User> {
		const user = await this.prismaService.user.create({data: {...userDto}})
		return user;
	}

	async getUser(name : string) : Promise<User> {
		try {
			const user = await this.prismaService.user.findUnique({ where: { username: name } });
			return user;
		}
		catch (error) { throw new NotFoundException("user not found")}
	}

	async getProfile(name : string) : Promise<any> {
		const user = await this.prismaService.user.findUnique(
			{
				where: { username: name },
				select: {
					username: true,
					avatars: {
						select: {
							linkThumbnail: true,
							linkMedium: true,
							linkLarge: true
						},
					},
					gameHistoryPOne: {
						select: {
							finishedAt: true,
							startedAt: true,
							score_playerOne: true,
							score_playerTwo: true,
							playerOne: {
								select: {
									username: true,
									avatars: {
										select: {
											linkThumbnail: true,
											linkMedium: true,
											linkLarge:true
										},
									},
								}
							},
							playerTwo: {
								select: {
									username: true,
									avatars: {
										select: {
											linkThumbnail: true,
											linkMedium: true,
											linkLarge:true
										},
									},
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
									avatars: {
										select: {
											linkThumbnail: true,
											linkMedium: true,
											linkLarge:true
										},
									},
								}
							},
							playerTwo: {
								select: {
									username: true,
									avatars: {
										select: {
											linkThumbnail: true,
											linkMedium: true,
											linkLarge:true
										},
									},
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
