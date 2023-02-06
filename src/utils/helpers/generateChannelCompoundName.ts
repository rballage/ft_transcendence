export default function generateChannelCompoudName(usernameA: string, usernameB: string): string {
    if (!usernameA || !usernameB) return undefined;
    if (usernameA < usernameB) return `@${usernameA}_${usernameB}`;
    else if (usernameA > usernameB) return `@${usernameB}_${usernameA}`;
    else return undefined;
}
