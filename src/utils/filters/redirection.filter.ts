import { ExceptionFilter, Catch, ArgumentsHost, HttpException, UnauthorizedException } from "@nestjs/common";
import { Response } from "express";

@Catch(UnauthorizedException)
export class RedirectAuthFilter implements ExceptionFilter {
    catch(exception: HttpException, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const status: number = exception.getStatus();
        ctx.getRequest().response.status(status).redirect("/api/auth/refresh");
    }
}
