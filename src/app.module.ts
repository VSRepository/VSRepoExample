import { Module, ValidationPipe } from "@nestjs/common";
import { AppController } from "./app.controller.js";
import { AppService } from "./app.service.js";
import { APP_FILTER, APP_PIPE } from "@nestjs/core";
import { AuthorModule } from "./modules/author/author.module.js";
import { ConfigModule } from "@nestjs/config";
import { PrismaModule } from "./infra/prisma/prisma.module.js";
import { BookModule } from "./modules/book/book.module.js";
import { VSRepoExceptionFilter } from "./common/filters/vsrepo-exception.filter.js";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter.js";
import { UnknownExceptionFilter } from "./common/filters/unknown-exception.filter.js";
import appConfig from "./configs/app.config.js";

@Module({
    imports: [AuthorModule, ConfigModule.forRoot({ isGlobal: true, load: [appConfig] }), PrismaModule, BookModule],
    controllers: [AppController],
    providers: [
        {
            provide: APP_PIPE,
            useValue: new ValidationPipe({
                transform: true,
                whitelist: true,
                forbidNonWhitelisted: true,
            }),
        },
        { provide: APP_FILTER, useClass: UnknownExceptionFilter },
        { provide: APP_FILTER, useClass: VSRepoExceptionFilter },
        { provide: APP_FILTER, useClass: HttpExceptionFilter },
        AppService,
    ],
})
export class AppModule {}
