import { Prisma } from "@prisma/client";

export const userChannelQuery = Prisma.validator<Prisma.UserArgs>()({
	select: {
		channelSubscriptions : {
			select: {
				channelId: true,
				role: true,
				channel: {
					select: {
						SubscribedUsers : {
							select: {
								role: true,
								username:true
							}
						}
					}
				}
			}
		}
	}
});

export type UserChannel = Prisma.UserGetPayload<typeof userChannelQuery>