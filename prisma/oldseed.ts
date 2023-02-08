import { PrismaClient, Prisma, eSubscriptionState, eChannelType, eRole } from "@prisma/client";

import { exit } from "process";
import generateChannelCompoundName from "../src/utils/helpers/generateChannelCompoundName";
import * as messages from "./messages.json";
import namesList from './names'

const prisma = new PrismaClient();

function randomProperty(obj: Object) {
    var keys = Object.keys(obj);
    return obj[keys[(keys.length * Math.random()) << 0]];
}

function randomDate(
    start: number = new Date().getTime() - (604800000 * 2),
    end: number = new Date().getTime(),
    startHour: number = 0,
    endHour: number = 23
) {

    let date: Date = new Date(start + Math.random() * (end - start));
    let hour = (startHour + Math.random() * (endHour - startHour)) | 0;
    date.setHours(hour);
    return date;
}

const publicChannels = [
    {
        name: "#general",
        channel_type: eChannelType.PUBLIC,
    },
    {
        name: "#event",
        channel_type: eChannelType.PUBLIC,
    },
    {
        name: "#orga",
        channel_type: eChannelType.PUBLIC,
    },
];

interface IChannel {
    id: String;
    name: String;
    createdAt: Date;
    updated: Date;
    channel_type: eChannelType;
    hash: String;
}

function genUser() {
    const idx = Math.floor(Math.random() * namesList.length)
    const idx2 = Math.floor(Math.random() * namesList.length)
    return {
        username: namesList[idx] + namesList[idx2],
        email: namesList[idx] + namesList[idx2] + '@student.42.fr',
    }
}

const nb_message_per_user = () => {
    return Math.floor(Math.random() * 100 + 20)
}

// const messages

const friend_coef = 10
const userCount = 20

async function main() {
    console.log(`Start seeding.`);
    console.log(`Seeding Users ...`);
    var userData = []
    for (var i = 0; i < userCount; i++) {
        userData.push(genUser())
    }
    for (const u of userData) {
        try {
            const user = await prisma.user.create({
                data: u,
            });
            // console.log(`Successfully created user with name:  ${user.username}`);
        } catch (error) {
            console.log(`Failed creation user with name:  ${u.username}: User already exist !`);
        }
    }
    console.log(`Seeding Public Channels ...`);
    let publicChannelsIDs = [];
    for (const pc of publicChannels) {
        try {
            const channel = await prisma.channel.create({
                data: pc,
            });
            publicChannelsIDs.push(channel.id);
        } catch (error) {
            console.log("warning:", error);
        }
    }
    console.log(`Seeding Subscription ...`);

    // loop on all users (i)
    // console.log(`[ info ] loop on all users (i)`);
    for (let i = 0; i < userData.length; i++) {
        // create subscription of all public channel for current user
        // console.log(`[ info ] create subscription of all public channel for "${userData[i].username}"`);
        for (const pc of publicChannelsIDs) {
            let sub_user_chan_public = undefined;
            try {
                sub_user_chan_public = await prisma.subscription.create({
                    data: {
                        username: userData[i].username,
                        channelId: pc,
                    },
                });
            } catch (error) {
                // console.log(error);
            }
            // create randoms message of current user in current public channel
            console.log(`[ info ] create randoms message from "${userData[i].username}" in public channel "${pc}"`);
            for (let k = 0; k < nb_message_per_user() ; k++) {
                try {
                    const d = randomDate() as Date;
                    const message = await prisma.message.create({
                        data: {
                            content: randomProperty(messages),
                            username: userData[i].username,
                            channelId: pc,
                            CreatedAt: d,
                            ReceivedAt: d,
                        },
                    });
                } catch (error) {
                    console.log(error);
                }
            }
        }
        // loop on all users (j)
        // console.log(`[ info ] loop on all users (j)`);
        for (let j = i + 1; j < userData.length; j++) {
            if (Math.floor(Math.random()) < 1/friend_coef) {
                console.log(
                    `[ info ] create follow between "${userData[i].username}" and "${userData[j].username} and vice versa"`
                );
                try {
                    const follow_1 = await prisma.follows.create({
                        data: {
                            followerId: userData[i].username,
                            followingId: userData[j].username,
                        },
                    });
                } catch (error) {
                    // console.log(error);
                }
                try {
                    const follow_2 = await prisma.follows.create({
                        data: {
                            followerId: userData[j].username,
                            followingId: userData[i].username,
                        },
                    });
                } catch (error) {
                    // console.log(error);
                }
                let channel = {} as any;
                try {
                    // create a one_to_one channel of user(i) and user(j)
                    // console.log(
                    // `[ info ] create a one_to_one channel of "${userData[i].username}" and "${userData[j].username}"`
                    // );
                    channel = await prisma.channel.create({
                        data: {
                            name: generateChannelCompoundName(userData[i].email, userData[j].email),
                            channel_type: eChannelType.ONE_TO_ONE,
                            SubscribedUsers: { createMany: { data: [{ username: userData[i].username }, { username: userData[j].username }] } },
                        },
                    });
                    try {
                        // create subscription for the channel of user(i)
                        // console.log(`[ info ] create subscription for the channel of "${userData[i].username}"`);
                        // const sub_user2 = await prisma.subscription.create({
                        //     data: {
                        //         username: userData[j].username,
                        //         channelId: channel.id,
                        //     },
                        // });
                        // create randoms message of current user in current public channel
                        console.log(
                            `[ info ] create randoms message of user "${userData[i].username}" in public channel "${channel.id}"`
                        );
                        for (let k = 0; k < nb_message_per_user() ; k++) {
                            try {
                                const d = randomDate() as Date;
                                const message = await prisma.message.create({
                                    data: {
                                        content: randomProperty(messages),
                                        username: userData[i].username,
                                        channelId: channel.id,
                                        CreatedAt: d,
                                        ReceivedAt: d,
                                    },
                                });
                            } catch (error) {
                                // console.log(error);
                            }
                        }
                    } catch (error) {
                        // console.log(error);
                    }
                    try {
                        // create subscription for the channel of user(j)
                        // console.log(`[ info ] create subscription for the channel of "${userData[j].username}"`);
                        const sub_user1 = await prisma.subscription.create({
                            data: {
                                username: userData[i].username,
                                channelId: channel.id,
                            },
                        });
                        // create randoms message of current user in current public channel
                        console.log(
                            `[ info ] create randoms message from "${userData[j].username}" in public channel "${channel.id}"`
                        );
                        for (let k = 0; k < nb_message_per_user() ; k++) {
                            try {
                                const d = randomDate() as Date;
                                const message = await prisma.message.create({
                                    data: {
                                        content: randomProperty(messages),
                                        username: userData[j].username,
                                        channelId: channel.id,
                                        CreatedAt: d,
                                        ReceivedAt: d,
                                    },
                                });
                            } catch (error) {
                                // console.log(error);
                            }
                        }
                    } catch (error) {
                        // console.log(error);
                    }
                } catch (error) {
                    // console.log(error);
                }
            }
        }
    }
    console.log(`Seeding finished.`);
}

main()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (e) => {
        console.error(e);
        await prisma.$disconnect();
        process.exit(1);
    });
