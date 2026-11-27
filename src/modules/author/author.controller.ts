import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    Query,
    HttpCode,
    HttpStatus,
    ParseUUIDPipe,
} from "@nestjs/common";
import { AuthorService } from "./author.service.js";
import { CreateAuthorDto } from "./dto/create-author.dto.js";
import { UpdateAuthorDto } from "./dto/update-author.dto.js";
import { SearchAuthorQueryDto } from "./dto/search-author-query.dto.js";
import { Author } from "../../generated/prisma/client.js";

@Controller("author")
export class AuthorController {
    constructor(private readonly authorService: AuthorService) {}

    @Post()
    create(@Body() createAuthorDto: CreateAuthorDto): Promise<Author> {
        return this.authorService.create(createAuthorDto);
    }

    @Get()
    findAll(@Query() query: SearchAuthorQueryDto): Promise<Author[]> {
        return this.authorService.findAll(query);
    }

    @Get(":id")
    findOne(@Param("id", ParseUUIDPipe) id: string): Promise<Author> {
        return this.authorService.findOne(id);
    }

    @Patch(":id")
    update(@Param("id", ParseUUIDPipe) id: string, @Body() updateAuthorDto: UpdateAuthorDto): Promise<Author> {
        return this.authorService.update(id, updateAuthorDto);
    }

    @Delete(":id")
    @HttpCode(HttpStatus.NO_CONTENT)
    remove(@Param("id", ParseUUIDPipe) id: string): Promise<void> {
        return this.authorService.remove(id);
    }

    @Post(":id/recover")
    @HttpCode(HttpStatus.NO_CONTENT)
    recover(@Param("id", ParseUUIDPipe) id: string): Promise<void> {
        return this.authorService.recover(id);
    }
}
