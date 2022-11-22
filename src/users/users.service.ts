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

	async getUser(username : string) : Promise<User> {
		const user = await this.prismaService.user.findUnique({ where: { name: username } });
		return user;
	}

	async getProfile(username : string) : Promise<any> {
		const user = await this.prismaService.user.findUnique(
			{
				where: { name: username },
				select: {
					name: true,
					avatar_large: true,
					gameHistoryPOne: {
						select: {
							finishedAt: true,
							startedAt: true,
							score_playerOne: true,
							score_playerTwo: true,
							playerOne: {
								select: {
									name: true,
									avatar_thumbnail: true,
								}
							},
							playerTwo: {
								select: {
									name: true,
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
									name: true,
									avatar_thumbnail: true,
								}
							},
							playerTwo: {
								select: {
									name: true,
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
