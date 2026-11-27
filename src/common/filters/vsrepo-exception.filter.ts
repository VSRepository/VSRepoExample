import { ArgumentsHost, Catch, ExceptionFilter, Logger } from "@nestjs/common";
import { Request, Response } from "express";
import { AdapterErrorCode, VSRepoAdapterError } from "vsrepo";

@Catch(VSRepoAdapterError)
export class VSRepoExceptionFilter implements ExceptionFilter {
    private readonly logger = new Logger(VSRepoExceptionFilter.name);

    private readonly knownErrors: Partial<Record<AdapterErrorCode, { status: number; message: string }>> = {
        NOT_FOUND: { message: "Not found", status: 404 },
        UNIQUE_CONSTRAINT_VIOLATION: { message: "Unique constraint violation", status: 409 },
    };

    catch(exception: VSRepoAdapterError, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest<Request>();

        const { status, message } = this.knownErrors[exception.code] ?? {
            message: "Internal server error",
            status: 500,
        };

        if (status >= 500) this.logger.error("Internal error caught:", exception);

        response.status(status).json({
            statusCode: status,
            timestamp: new Date().toISOString(),
            path: request.url,
            message,
        });
    }
}
