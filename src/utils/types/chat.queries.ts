import { Prisma, Channel, eChannelType, eSubscriptionState, eRole, PrismaClient, User } from "@prisma/client";

export const userChannelQuery = Prisma.validator<Prisma.UserArgs>()({
    select: {
        channelSubscriptions: {
            select: {
                channelId: true,
                role: true,
                channel: {
                    select: {
                        SubscribedUsers: {
                            select: {
                                role: true,
                                username: true,
                            },
                        },
                    },
                },
            },
        },
    },
});

export type UserChannel = Prisma.UserGetPayload<typeof userChannelQuery>;

export const subQuery = Prisma.validator<Prisma.SubscriptionArgs>()({
    select: {
        channel: {
            select: {
                SubscribedUsers: {
                    select: {
                        id: true,
                        username: true,
                        role: true,
                        state: true,
                        stateActiveUntil: true,
                    },
                },
                id: true,
                name: true,
                hash: true,
                channel_type: true,
            },
        },
        id: true,
        role: true,
        channelId: true,
        state: true,
        username: true,
    },
});
export type SubInfosWithChannelAndUsers = Prisma.SubscriptionGetPayload<typeof subQuery>;
export const whereUserIsInChannel = (username: string, channelId: string, role: eRole) => {
    return Prisma.validator<Prisma.SubscriptionWhereInput>()({ username, channelId });
};

export const subQueryWithMessages = Prisma.validator<Prisma.SubscriptionArgs>()({
    select: {
        channel: {
            select: {
                SubscribedUsers: {
                    select: {
                        id: true,
                        username: true,
                        role: true,
                        state: true,
                        stateActiveUntil: true,
                    },
                },
                id: true,
                name: true,
                hash: true,
                channel_type: true,
                messages: {
                    select: {
                        id: true,
                        content: true,
                        CreatedAt: true,
                        ReceivedAt: true,
                        username: true,
                    },
                },
            },
        },
        id: true,
        role: true,
        channelId: true,
        state: true,
        stateActiveUntil: true,
        username: true,
    },
});
export type SubInfosWithChannelAndUsersAndMessages = Prisma.SubscriptionGetPayload<typeof subQueryWithMessages>;
