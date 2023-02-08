import { PrismaClient, Prisma, eSubscriptionState, eChannelType, eRole } from "@prisma/client";

import { exit } from "process";
import generateChannelCompoundName from "../src/utils/helpers/generateChannelCompoundName";
import * as messages from "./messages.json";
import namesList from './names'

const prisma = new PrismaClient();

const message_count_max = 100
const userCount = 50

const follow_coef = 0.2
const message_coef_private = 0.5
const message_coef_public = 0.1

interface User {
    username: string
    password: string
    email: string
}

interface Message {
    content: string
    username: string
    channelId: string
    CreatedAt: Date
    ReceivedAt: Date
}

interface Channel {
    name: string
    channel_type: string
}

interface Subscription {

}

interface Follow {
    followerId: string
    followingId: string
}

class Generator {
    private getRandomAwnser(coef: number) { return Math.random() < coef }
    follow() { return this.getRandomAwnser(follow_coef) }
    private_message() { return this.getRandomAwnser(message_coef_private) }
    public_message() { return this.getRandomAwnser(message_coef_public) }
}
const gen = new Generator()

/// UTILS //////////////////////////////////////////////////////////////////////
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
function genUser() {
    const idx = Math.floor(Math.random() * namesList.length)
    const idx2 = Math.floor(Math.random() * namesList.length)
    return {
        username: namesList[idx] + namesList[idx2],
        password: 'null',
        email: namesList[idx] + namesList[idx2] + '@student.42.fr',
    }
}
////////////////////////////////////////////////////////////////////////////////
async function main() {
// messages:
// const d = randomDate() as Date;
// return {
//   content: randomProperty(messages),
//   username: userData[i].username,
//   channelId: channel.id,
//   CreatedAt: d,
//   ReceivedAt: d,
// }

/// USERS //////////////////////////////////////////////////////////////////////
const users: Array<User> = Array.from({ length: userCount }).map(() => {
    return genUser()
});
console.log(`=================== users: ${users.length}`);
console.log(users);
await prisma.user.createMany({data:users as Array<any>})
.then((ret) => {
    console.log('then:', ret);
})
.catch((ret) => {
    console.log('catch:', ret);
})

// ////////////////////////////////////////////////////////////////////////////////

/// PUBLICS CHANNELS ///////////////////////////////////////////////////////////
const publicChannels: Array<Channel> = [
    {
        name: "#general",
        channel_type: eChannelType.PUBLIC,
        // SubscribedUsers: users.map((user: User) => user.username)
    },
    {
        name: "#event",
        channel_type: eChannelType.PUBLIC,
        // SubscribedUsers: users.map((user: User) => user.username)
    },
    {
        name: "#orga",
        channel_type: eChannelType.PUBLIC,
        // SubscribedUsers: users.map((user: User) => user.username)
    },
];
console.log(`=================== publicChannels: ${publicChannels.length}`);
console.log(publicChannels);
await prisma.channel.createMany({data:publicChannels as Array<any>})
.then((ret) => {
    console.log('then:', ret);
})
.catch((ret) => {
    console.log('catch:', ret);
})
// ////////////////////////////////////////////////////////////////////////////////
// function createFollowData(u1: string, u2: string) {
//     return {
//         followerId: u1,
//         followingId: u2
//     }
// }
// var follows: Array<Follow> = []

// for (const [i, user] of users.entries()) {
//     for (const user2 of users.slice(i+1)) {
//         if (gen.follow())
//             follows.push(createFollowData(user.username, user2.username))
//     }
// }
// console.log(`=================== follows: ${follows.length}`);
// console.log(follows);
// const fol = prisma.follows.createMany({data:follows as Array<any>})
// console.log(fol);



}

main()