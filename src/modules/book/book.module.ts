import { Module } from "@nestjs/common";
import { BookService } from "./book.service.js";
import { BookController } from "./book.controller.js";
import { BookRepository } from "./repositories/book.repository.js";
import { AuthorModule } from "../author/author.module.js";
import { GenreRepository } from "./repositories/genre.repository.js";

@Module({
    imports: [AuthorModule],
    controllers: [BookController],
    providers: [BookService, BookRepository, GenreRepository],
    exports: [BookService],
})
export class BookModule {}
