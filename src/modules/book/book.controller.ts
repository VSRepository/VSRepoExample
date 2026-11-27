import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    ParseUUIDPipe,
    Query,
    HttpCode,
    HttpStatus,
} from "@nestjs/common";
import { BookService } from "./book.service.js";
import { CreateBookDto } from "./dto/create-book.dto.js";
import { UpdateBookDto } from "./dto/update-book.dto.js";
import { SearchBookQueryDto } from "./dto/search-book-query.dto.js";
import { Book } from "../../generated/prisma/client.js";

@Controller("book")
export class BookController {
    constructor(private readonly bookService: BookService) {}

    @Post()
    create(@Body() createBookDto: CreateBookDto): Promise<Book> {
        return this.bookService.create(createBookDto);
    }

    @Get()
    findAll(@Query() query: SearchBookQueryDto): Promise<Book[]> {
        return this.bookService.findAll(query);
    }

    @Get(":id")
    findOne(@Param("id", ParseUUIDPipe) id: string): Promise<Book> {
        return this.bookService.findOne(id);
    }

    @Patch(":id")
    update(@Param("id", ParseUUIDPipe) id: string, @Body() updateBookDto: UpdateBookDto): Promise<Book> {
        return this.bookService.update(id, updateBookDto);
    }

    @Delete(":id")
    @HttpCode(HttpStatus.NO_CONTENT)
    remove(@Param("id", ParseUUIDPipe) id: string): Promise<void> {
        return this.bookService.remove(id);
    }
}
