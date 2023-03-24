import { ExceptionFilter, Catch, ArgumentsHost, HttpException, UnauthorizedException } from "@nestjs/common";
import { HttpArgumentsHost } from "@nestjs/common/interfaces";
import { Response } from "express";
import { WsService } from "src/ws/ws.service";
import { clearCookies } from "../helpers/clearCookies";

@Catch(UnauthorizedException)
export class RedirectAuthFilter implements ExceptionFilter {
    catch(exception: HttpException, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const status: number = exception.getStatus();
        response.status(status).redirect("/api/auth/refresh");
    }
}

// @Catch(UnauthorizedException)
export class AuthErrorFilter implements ExceptionFilter<UnauthorizedException> {
    constructor(private readonly wsService: WsService) {}
    catch(exception: UnauthorizedException, host: ArgumentsHost) {
        const ctx: HttpArgumentsHost = host.switchToHttp();
        const response: Response = ctx.getResponse<Response>();
        const request: Request = ctx.getRequest<Request>();
        const status: number = exception.getStatus();
        if (status === 401 && (request.url === "/api/auth/refresh" || request.url === "/api/auth/logout")) {
            clearCookies(response);
            response.clearCookie("Authentication");
            response.clearCookie("has_access");
            response.clearCookie("Refresh");
            response.clearCookie("has_refresh");
            response.clearCookie("WsAuth");
        }
        return response.status(status).json({
            statusCode: status,
            timestamp: new Date().toISOString(),
            path: request.url,
        });
    }
}
