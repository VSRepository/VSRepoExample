import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { CreateBookDto } from "./dto/create-book.dto.js";
import { UpdateBookDto } from "./dto/update-book.dto.js";
import { BookRepository } from "./repositories/book.repository.js";
import { Book } from "./entities/book.entity.js";
import { AuthorService } from "../author/author.service.js";
import { DeepPartial, VSRepoWhere } from "vsrepo";
import { Transactional } from "@vsrepo/nestjs";
import { SearchBookQueryDto } from "./dto/search-book-query.dto.js";
import { Genre } from "./entities/genre.entity.js";
import { GenreRepository } from "./repositories/genre.repository.js";

@Injectable()
export class BookService {
    constructor(
        private readonly bookRepository: BookRepository,
        private readonly authorService: AuthorService,
        private readonly genreRepository: GenreRepository,
    ) {}

    private assertExists<T>(book: T): asserts book is NonNullable<T> {
        if (!book) throw new NotFoundException("Book not found");
    }

    private async assertIsbnIsAvailable(isbn: string): Promise<void> {
        const exists = await this.bookRepository.existsByIsbn(isbn);
        if (exists) throw new ConflictException("There is already a book with this ISBN");
    }

    private async persistManyGenresByName(names: string[]): Promise<Genre[]> {
        const existingGenres = await this.genreRepository.findGenresByNameIn(names);
        const existingGenresNames = new Set(existingGenres.map(genre => genre.name));

        const notExistingGenres: { name: string }[] = [];

        for (const genre of names) {
            if (!existingGenresNames.has(genre)) notExistingGenres.push({ name: genre });
        }

        const newGenres = await this.genreRepository.createManyReturning(notExistingGenres);

        return newGenres.concat(existingGenres);
    }

    @Transactional()
    async create(dto: CreateBookDto): Promise<Book> {
        await this.authorService.assertExistsById(dto.authorId);
        if (dto.isbn) await this.assertIsbnIsAvailable(dto.isbn);

        const genres = await this.persistManyGenresByName(dto.genres);

        const book: DeepPartial<Book> = { ...dto, genres };

        return await this.bookRepository.save(book, { relations: { genres: true, author: true } });
    }

    async findAll({
        page,
        perPage,
        authorId,
        genre,
        isbn,
        publicationDate,
        title,
    }: SearchBookQueryDto): Promise<Book[]> {
        const where: VSRepoWhere<Book> = { author: { _with: { deletedAt: null } } };

        if (authorId) where.authorId = authorId;
        if (genre) where.genres = { _some: { name: genre } };
        if (isbn) where.isbn = isbn;
        if (publicationDate) where.publicationDate = publicationDate;
        if (title) where.title = { contains: title };

        return this.bookRepository
            .createQueryBuilder()
            .where(where)
            .relations({ author: true, genres: true })
            .relationsOptions({ genres: { order: { name: "ASC" } } })
            .limit(perPage)
            .offset((page - 1) * perPage)
            .getResult();
    }

    async findOne(id: string): Promise<Book> {
        const book = await this.bookRepository.findOneByIdAndAuthorWithDeletedAtNull(id, {
            relations: { genres: true, author: true },
        });
        this.assertExists(book);

        return book;
    }

    @Transactional()
    async update(id: string, dto: UpdateBookDto): Promise<Book> {
        const book = await this.bookRepository.findOneByIdAndAuthorWithDeletedAtNull(id);
        this.assertExists(book);

        if (dto.isbn && dto.isbn !== book.isbn) await this.assertIsbnIsAvailable(dto.isbn);
        if (dto.authorId) await this.authorService.assertExistsById(dto.authorId);

        const genres = dto.genres && (await this.persistManyGenresByName(dto.genres));

        const bookData: DeepPartial<Book> = { ...dto, genres };

        return await this.bookRepository.patch(id, bookData, { relations: { author: true, genres: true } });
    }

    async remove(id: string): Promise<void> {
        const book = await this.bookRepository.findOneByIdAndAuthorWithDeletedAtNull(id);
        this.assertExists(book);

        await this.bookRepository.deleteById(id);
    }
}
