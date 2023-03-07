#!/usr/bin/env ts-node
import * as ch from "chevrotain";

const Username = ch.createToken({
    name: "Username",
    pattern: /[a-zA-Z]+/,
});

const Duration = ch.createToken({
    name: "Duration",
    pattern: /\d+/,
});

const BanCmd     = ch.createToken({ name: "ban"    , pattern: /\/ban/ });
const MuteCmd    = ch.createToken({ name: "mute"   , pattern: /\/mute/ });
const KickCmd    = ch.createToken({ name: "kick"   , pattern: /\/kick/ });
const PromoteCmd = ch.createToken({ name: "promote", pattern: /\/promote/ });
const PardonCmd  = ch.createToken({ name: "pardon" , pattern: /\/pardon/ });
const DemoteCmd  = ch.createToken({ name: "demote" , pattern: /\/demote/ });

const WhiteSpace = ch.createToken({
    name: "WhiteSpace",
    pattern: /\s+/,
    group: ch.Lexer.SKIPPED,
});

const allTokens = [WhiteSpace, Username, Duration, BanCmd, MuteCmd, KickCmd, PromoteCmd, PardonCmd, DemoteCmd];

const ChatLexer = new ch.Lexer(allTokens);

export interface ICommand {
    status: "OK" | "ERROR";
    message_status: string;
    name: string;
    username: string;
    duration?: number;
}

export function parseCommand(text: string): ICommand {
    const ret: ICommand = {
        status: "ERROR",
        message_status: "",
        name: "",
        username: "",
        duration: 0,
    };
    const tokens: ch.ILexingResult = ChatLexer.tokenize(text);
    let pos = 0;
    const consume = (tokenType: ch.TokenType[]) => {
        const token: ch.IToken = tokens.tokens[pos];
        if (!token) {
            throw new Error(`Unexpected end of line`);
        }
        const foundTokenType = tokenType.find((e: any) => {
            return token.tokenType === e;
        });
        if (!foundTokenType) {
            throw new Error(
                `Expected ${tokenType.map((e: ch.TokenType, index: number) => {
                    if (!index)
                        return e.name
                    if (index + 1 == tokenType.length)
                        return ' or ' + e.name
                    return ' ' + e.name
                })} but got ${token.tokenType.name}`
            );
        }
        pos++;
        return token;
    };
    try {
        const commandName = consume([BanCmd, MuteCmd, KickCmd, PromoteCmd, DemoteCmd, PardonCmd] as ch.TokenType[]).image.slice(1);
        ret.name = commandName;
        switch (commandName) {
            case "ban":
            case "mute":
                const usernameToken = consume([Username]);
                ret.username = usernameToken.image;
                if (ret.username.length === 0) {
                    throw new Error("Username cannot be empty");
                }
                const durationToken = consume([Duration]);
                ret.duration = parseInt(durationToken.image);
                if (ret.duration <= 0) {
                    throw new Error("Duration must be greater than zero");
                }
                break;
            case "pardon":
            case "kick":
            case "promote":
            case "demote":
                ret.username = consume([Username]).image;
                break;
            default:
                throw new Error(`Unknown command: ${commandName}`);
        }
    } catch (err: any) {
        ret.message_status = err.message;
        return ret as ICommand;
    }
    ret.status = "OK";
    return ret as ICommand;
}