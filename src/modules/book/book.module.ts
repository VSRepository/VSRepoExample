import { Module } from "@nestjs/common";
import { BookService } from "./book.service.js";
import { BookController } from "./book.controller.js";
import { BookRepository } from "./repositories/book.repository.js";
import { VSRepositoryModule } from "@vsrepo/nestjs";
import { Prisma7Adapter } from "@vsrepo/prisma7-adapter";
import { Book } from "./entities/book.entity.js";
import { AuthorModule } from "../author/author.module.js";
import { Genre } from "./entities/genre.entity.js";
import { GenreRepository } from "./repositories/genre.repository.js";

@Module({
    imports: [
        VSRepositoryModule.forFeature<Prisma7Adapter<Book>>("Book", {
            modelName: "book",
            pkName: "id",
            relations: { genres: { mode: "mtm", pk: "id", onUpdate: "set" } },
        }),
        VSRepositoryModule.forFeature<Prisma7Adapter<Genre>>("Genre", { modelName: "genre", pkName: "id" }),
        AuthorModule,
    ],
    controllers: [BookController],
    providers: [BookService, BookRepository, GenreRepository],
    exports: [BookService],
})
export class BookModule {}
