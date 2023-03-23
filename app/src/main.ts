import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { AppModule } from "./app.module";
import * as cookieParser from "cookie-parser";
import { WsSocketAdapter } from "./ws/ws.adapter";

async function bootstrap() {
    const app = await NestFactory.create(AppModule.register(), {
        forceCloseConnections: true,
    });
    app.useWebSocketAdapter(new WsSocketAdapter(app));
    app.use(cookieParser());
    app.setGlobalPrefix("api");
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true, transformOptions: { enableImplicitConversion: true } }));
    app.enableShutdownHooks();
    await app.listen(process.env.NODE_ENV === "prod" ? 9000 : 3000, "::");
    console.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap();
