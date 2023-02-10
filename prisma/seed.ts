import { PrismaClient, Prisma, eSubscriptionState, eChannelType, eRole } from "@prisma/client";

import { exit } from "process";
import generateChannelCompoundName from "../src/utils/helpers/generateChannelCompoundName";
import * as messages from "./messages.json";
import namesList from "./names";
const OlduserData: any[] = [
    {
        username: "adeburea",
        email: "adeburea@student.42.fr",
        password: "null",
    },
    {
        username: "rballage",
        email: "rballage@student.42.fr",
        password: "null",
    },
    {
        username: "tharchen",
        email: "tharchen@student.42.fr",
        password: "null",
    },
    {
        username: "leCaca",
        email: "leCaca@student.42.fr",
        password: "null",
    },
    {
        username: "admin",
        email: "admin@student.42.fr",
        password: "null",
    },
    {
        username: "guestman",
        email: "guest@student.42.fr",
        password: "null",
    },
    {
        username: "HelloTheDude",
        email: "hello@student.42.fr",
        password: "null",
    },
    {
        username: "BigBoss",
        email: "BigBoss@student.42.fr",
        password: "null",
    },
    {
        username: "Victor",
        email: "victor@student.42.fr",
        password: "null",
    },
    {
        username: "Alice99",
        email: "alice99student.42.fr",
        password: "null",
    },
    {
        username: "dracula",
        email: "dracula_luv_blood@student.42.fr",
        password: "null",
    },
    {
        username: "Jasper",
        email: "cantseeme@student.42.fr",
        password: "null",
    },
    {
        username: "PongMaster",
        email: "ping@student.42.fr",
        password: "null",
    },
    {
        username: "toto",
        email: "toto@42.fr",
        password: "null",
    },
];
console.log("messsages dataset stats:");
var stat = {
    min: 1e30,
    max: 0,
    mean: 0,
};
for (const k of Object.keys(messages)) {
    if (messages[k].length < stat.min) {
        stat.min = messages[k].length;
    }
    if (messages[k].length > stat.max) {
        stat.max = messages[k].length;
    }
    stat.mean += messages[k].length;
}
stat.mean /= Object.keys(messages).length;
console.log(stat);

const prisma = new PrismaClient();

//////////////////////////////////////////////
// VARIABLES /////////////////////////////////
const message_count_max = 100;
const userCount = 50;

const follow_coef = 0.2;
const message_coef_private = 0.5;
const message_coef_public = 0.1;
//////////////////////////////////////////////
//////////////////////////////////////////////

interface User {
    username: string;
    password: string;
    email: string;
}

interface Message {
    content: string;
    username: string;
    channelId: string;
    CreatedAt: Date;
    ReceivedAt: Date;
}

interface Channel {
    name: string;
    channel_type: string;
}

interface Subscription {}

interface Follow {
    followerId: string;
    followingId: string;
}

class Generator {
    private getRandomAwnser(coef: number) {
        return Math.random() < coef;
    }
    follow() {
        return this.getRandomAwnser(follow_coef);
    }
    private_message() {
        return this.getRandomAwnser(message_coef_private);
    }
    public_message() {
        return this.getRandomAwnser(message_coef_public);
    }
    followCount() {
        return message_count_max * follow_coef;
    }
    private_messageCount() {
        return message_count_max * message_coef_private;
    }
    public_messageCount() {
        return message_count_max * message_coef_public;
    }
}
const gen = new Generator();

/// UTILS //////////////////////////////////////////////////////////////////////
function randomProperty(obj: Object) {
    var keys = Object.keys(obj);
    return obj[keys[(keys.length * Math.random()) << 0]];
}

function randomDate(start: number = new Date().getTime() - 604800000 * 2, end: number = new Date().getTime() - 3600000, startHour: number = 0, endHour: number = 23) {
    let date: Date = new Date(start + Math.random() * (end - start));
    let hour = (startHour + Math.random() * (endHour - startHour)) | 0;
    date.setHours(hour);
    return date;
}
function genUser() {
    const idx = Math.floor(Math.random() * namesList.length);
    const idx2 = Math.floor(Math.random() * namesList.length);
    return {
        username: namesList[idx] + namesList[idx2],
        password: "null",
        email: namesList[idx] + namesList[idx2] + "@student.42.fr",
    };
}

function findEmailByUsername(users: Array<User>,username: string) {
    return users.find((elem)=>{
        return elem.username == username
    })
}
////////////////////////////////////////////////////////////////////////////////
async function main() {
    console.log(`USERS CREATION (count: ${userCount})`);
    /// USERS //////////////////////////////////////////////////////////////////////
    const users: Array<User> = Array.from({ length: userCount })
        .map(() => {
            return genUser();
        })
        .concat(OlduserData);
    const userCountReal = (await prisma.user.createMany({ data: users as Array<any>, skipDuplicates: true })).count;
    console.log(`total of created users: ${userCountReal})`);

    //////////////////////////////////////////////////////////////////////////////////

    /// PUBLICS CHANNELS ///////////////////////////////////////////////////////////
    const publicChannels: Array<Channel> = [
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
    console.log(`PUBLIC CHANNEL CREATION (count: ${publicChannels.length})`);
    await prisma.channel.createMany({ data: publicChannels as Array<any> });

    const publicChannelsRet = await prisma.channel.findMany({ where: { channel_type: "PUBLIC" } });

    // create public subscriptions for all users
    console.log(`    MESSAGE CREATION (count: ${publicChannelsRet.length * userCountReal * gen.public_messageCount()})`);
    console.log(`    SUBSCRIPTIONS CREATION (count: ${publicChannelsRet.length * userCountReal})`);
    let publicSub = [];
    var publicMessages = [];
    for (const publicChannel of publicChannelsRet) {
        publicSub = publicSub.concat(
            users.map((user: User) => {
                return {
                    username: user.username,
                    channelId: publicChannel.id,
                };
            })
        );
        for (const user of users) {
            publicMessages = publicMessages.concat(
                Array.from({ length: gen.public_messageCount() }).map(() => {
                    const d = randomDate() as Date;
                    return {
                        content: randomProperty(messages),
                        username: user.username,
                        channelId: publicChannel.id,
                        CreatedAt: d,
                        ReceivedAt: d,
                    };
                })
            );
        }
    }

    await prisma.subscription.createMany({ data: publicSub as Array<any> });
    await prisma.message.createMany({ data: publicMessages as Array<any> });

    ////////////////////////////////////////////////////////////////////////////////
    console.log(`USERS FOLLOWS CREATION (count: ~${userCountReal * userCountReal * follow_coef})`);
    function createFollowData(u1: string, u2: string) {
        return {
            followerId: u1,
            followingId: u2,
        };
    }
    var follows: Array<Follow> = [];

    for (const user of users) {
        for (const user2 of users) {
            if (user.username != user2.username && gen.follow()) follows.push(createFollowData(user.username, user2.username));
        }
    }
    await prisma.follows.createMany({ data: follows as Array<any> });

    console.log(`USERS FRIEND DETECTION`);
    var tmp = [];
    var ret = [];
    follows.forEach((elem) => {
        if (
            tmp.find((tmpelem) => {
                return elem.followerId == tmpelem.followingId && elem.followingId == tmpelem.followerId;
            })
        )
            ret.push(elem);
        else tmp.push(elem);
    });
    console.log(`ONE_TO_ONE CHANNEL CREATION (count: ~${ret.length})`);
    var onetoone_chan = [];
    ret.forEach((elem) => {
        onetoone_chan.push({
            name: findEmailByUsername(users, elem.followerId).email + findEmailByUsername(users, elem.followingId).email,
            channel_type: eChannelType.ONE_TO_ONE,
        });
    });
    await prisma.channel.createMany({ data: onetoone_chan as Array<any> });
    const onetooneChannel = await prisma.channel.findMany({ where: { channel_type: "ONE_TO_ONE" } });

    console.log(`ONE_TO_ONE CHANNEL SUBSCRIPTIONS CREATION (count: ~${ret.length * 2})`);
    var onetoone_sub = []

    onetooneChannel.forEach((elem, i) => {
        onetoone_sub.push({
            username: ret[i].followerId,
            channelId: elem.id,
        });
        onetoone_sub.push({
            username: ret[i].followingId,
            channelId: elem.id
        })
    })
    await prisma.subscription.createMany({data:onetoone_sub as Array<any>})


    // create private channel
    const copains = users.slice(0, 5)


    const copainChannel = await prisma.channel.create({
        data: {
            name: 'copains',
            channel_type: eChannelType.PRIVATE,
        }
    })

    var copainSub = []

    copainSub.push({
        username: copains[0].username,
        channelId: copainChannel.id,
        role: eRole.OWNER
    })

    copainSub.push({
        username: copains[1].username,
        channelId: copainChannel.id,
        role: eRole.ADMIN
    })

    for (const user of copains.slice(2)) {
        copainSub.push({
            username: user.username,
            channelId: copainChannel.id,
            role: eRole.USER
        })
    }

    console.log(copainSub);
    await prisma.subscription.createMany({ data: copainSub })
}

main();
