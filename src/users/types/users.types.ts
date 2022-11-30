import { Prisma } from "@prisma/client"

export const userProfileQuery = Prisma.validator<Prisma.UserArgs>()({
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


export const userWholeQuery = Prisma.validator<Prisma.UserArgs>()({
	select: {
		username: true,
		email : true,
		TwoFA : true,
		createdAt : true,
		updatedAt : true,
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

		channelSubscriptions : {select: {
			channelId: true,
			role: true
		}},
		followedBy : {select:{
			followerId: true
		}},
		following : {select:{
			followingId: true
		}},
		blocking : {select:{
			blockingId:true
		}}
	}
});


export type UserProfile = Prisma.UserGetPayload<typeof userProfileQuery>

export type UserWhole = Prisma.UserGetPayload<typeof userWholeQuery>