import { ArgumentsHost, Catch, ExceptionFilter, Logger } from "@nestjs/common";
import type { Response } from "express";

@Catch()
export class UnknownExceptionFilter implements ExceptionFilter {
    private readonly logger = new Logger(UnknownExceptionFilter.name);

    catch(exception: unknown, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest<Request>();

        this.logger.error("Internal error caught:", exception);

        const status = 500;

        response.status(status).json({
            statusCode: status,
            timestamp: new Date().toISOString(),
            path: request.url,
            message: "Internal Server Error",
        });
    }
}
