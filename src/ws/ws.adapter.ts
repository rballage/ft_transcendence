import { ExecutionContext, INestApplicationContext } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { IoAdapter } from "@nestjs/platform-socket.io";
import { Request } from "express";

import { isFunction, isNil } from "@nestjs/common/utils/shared.utils";
import { AbstractWsAdapter, MessageMappingProperties } from "@nestjs/websockets";
import { DISCONNECT_EVENT } from "@nestjs/websockets/constants";
// import { fromEvent, Observable } from "rxjs";
import { filter, first, map, mergeMap, share, takeUntil } from "rxjs/operators";
import { Server, ServerOptions, Socket } from "socket.io";

class WsEngine extends Server {
    constructor() {
        super();
    }

    generateId(req: Request) {
        // console.log(req.headers.cookie);

        // Your custom ID generation logic here
        return "custom-id";
    }
}

export class WsSocketAdapter extends IoAdapter {
    constructor(app: INestApplicationContext) {
        super(app);
        // app.get()
    }

    createIOServer(port: number, options?: any): Server {
        options ? (options.server = new WsEngine()) : { ...options, server: new WsEngine() };
        // super.create()
        const server: Server = super.createIOServer(port, options);
        // console.log(server.engine.generateId());
        // server.engine.generateId = (req: Request) => {
        //     console.log(req.headers.cookie);
        //     // Add custom logic to generate socket IDs here
        //     return req.headers.cookie;
        // };
        // server.engine.generateId = (req: Request) => {
        //     // Add custom logic to generate socket IDs here
        //     return "custom-socket-id";
        // };
        // console.log("YO");
        return server;
    }
    // canActivate(context: ExecutionContext): boolean | Promise<boolean> {
    //     // const guard = new AuthGuard("jwt");
    //     // return guard.canActivate(context);
    //     const ctx = context.switchToHttp();
    //     console.log(ctx);
    //     // throw new Error("Method not implemented.");
    //     return false;
    // }
}
