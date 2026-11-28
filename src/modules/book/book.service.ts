import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { CreateBookDto } from "./dto/create-book.dto.js";
import { UpdateBookDto } from "./dto/update-book.dto.js";
import { BookRepository } from "./repositories/book.repository.js";
import { Book } from "./entities/book.entity.js";
import { AuthorService } from "../author/author.service.js";
import { SearchBookQueryDto } from "./dto/search-book-query.dto.js";
import { Genre } from "./entities/genre.entity.js";
import { GenreRepository } from "./repositories/genre.repository.js";
import { Prisma } from "../../generated/prisma/client.js";

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

    private async assertIsbnIsAvailable(isbn: string, tx?: Prisma.TransactionClient): Promise<void> {
        const exists = await this.bookRepository.existsByIsbn(isbn, { tx });
        if (exists) throw new ConflictException("There is already a book with this ISBN");
    }

    private async persistManyGenresByName(names: string[], tx?: Prisma.TransactionClient): Promise<Genre[]> {
        const existingGenres = await this.genreRepository.findGenresByNameIn(names, { tx });
        const existingGenresNames = new Set(existingGenres.map(genre => genre.name));

        const notExistingGenres: { name: string }[] = [];

        for (const genre of names) {
            if (!existingGenresNames.has(genre)) notExistingGenres.push({ name: genre });
        }

        const newGenres = await this.genreRepository.createManyReturning(notExistingGenres, { tx });

        return newGenres.concat(existingGenres);
    }

    async create(dto: CreateBookDto): Promise<Book> {
        return await this.bookRepository.transaction(async tx => {
            await this.authorService.assertExistsById(dto.authorId, tx);
            if (dto.isbn) await this.assertIsbnIsAvailable(dto.isbn, tx);

            const genres = await this.persistManyGenresByName(dto.genres, tx);

            return await this.bookRepository.save(
                {
                    ...dto,
                    genres: { connectOrCreate: genres.map(genre => ({ create: genre, where: { id: genre.id } })) },
                },
                { include: { genres: true, author: true }, tx },
            );
        });
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
        return this.bookRepository.find(
            {
                author: { is: { deletedAt: null, id: authorId } },
                genres: genre ? { some: { name: genre } } : undefined,
                title: { contains: title },
                publicationDate,
                isbn,
            },
            {
                include: { author: true, genres: { orderBy: { name: "asc" } } },
                take: perPage,
                skip: (page - 1) * perPage,
            },
        );
    }

    async findOne(id: string): Promise<Book> {
        const book = await this.bookRepository.findOneByIdAndAuthorWithDeletedAtNull(id, {
            include: { genres: true, author: true },
        });
        this.assertExists(book);

        return book;
    }

    async update(id: string, dto: UpdateBookDto): Promise<Book> {
        return await this.bookRepository.transaction(async tx => {
            const book = await this.bookRepository.findOneByIdAndAuthorWithDeletedAtNull(id, { tx });
            this.assertExists(book);

            if (dto.isbn && dto.isbn !== book.isbn) await this.assertIsbnIsAvailable(dto.isbn, tx);
            if (dto.authorId) await this.authorService.assertExistsById(dto.authorId, tx);

            const genres = dto.genres && (await this.persistManyGenresByName(dto.genres, tx));

            return await this.bookRepository.patch(
                id,
                {
                    ...dto,
                    genres: {
                        set: genres ? [] : undefined,
                        connectOrCreate: genres?.map(genre => ({ create: genre, where: { id: genre.id } })),
                    },
                },
                { include: { author: true, genres: true }, tx },
            );
        });
    }

    async remove(id: string): Promise<void> {
        const book = await this.bookRepository.findOneByIdAndAuthorWithDeletedAtNull(id);
        this.assertExists(book);

        await this.bookRepository.deleteById(id);
    }
}
