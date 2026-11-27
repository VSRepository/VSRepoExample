import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { CreateBookDto } from "./dto/create-book.dto.js";
import { UpdateBookDto } from "./dto/update-book.dto.js";
import { SearchBookQueryDto } from "./dto/search-book-query.dto.js";
import { PrismaService } from "../../infra/prisma/prisma.service.js";
import { Book, Genre, Prisma } from "../../generated/prisma/client.js";

@Injectable()
export class BookService {
    constructor(private readonly prisma: PrismaService) {}

    private assertExists<T>(book: T): asserts book is NonNullable<T> {
        if (!book) throw new NotFoundException("Book not found");
    }

    private async assertIsbnIsAvailable(isbn: string, tx?: Prisma.TransactionClient): Promise<void> {
        const prisma = tx ?? this.prisma;

        const exists = await prisma.book.findUnique({ where: { isbn }, select: { id: true } });
        if (exists) throw new ConflictException("There is already a book with this ISBN");
    }

    private async persistManyGenresByName(names: string[], tx?: Prisma.TransactionClient): Promise<Genre[]> {
        const prisma = tx ?? this.prisma;

        const existingGenres = await prisma.genre.findMany({ where: { name: { in: names } } });
        const existingGenresNames = new Set(existingGenres.map(genre => genre.name));

        const notExistingGenres: { name: string }[] = [];

        for (const genre of names) {
            if (!existingGenresNames.has(genre)) notExistingGenres.push({ name: genre });
        }

        const newGenres = await prisma.genre.createManyAndReturn({ data: notExistingGenres });

        return newGenres.concat(existingGenres);
    }

    async create(dto: CreateBookDto): Promise<Book> {
        return await this.prisma.$transaction(async tx => {
            const exists = await tx.author.findUnique({
                where: { id: dto.authorId, deletedAt: null },
                select: { id: true },
            });
            if (!exists) throw new NotFoundException("There is no author with the provided ID");

            if (dto.isbn) await this.assertIsbnIsAvailable(dto.isbn, tx);

            const genres = await this.persistManyGenresByName(dto.genres, tx);

            return await tx.book.create({
                data: {
                    ...dto,
                    genres: { connectOrCreate: genres.map(genre => ({ create: genre, where: { id: genre.id } })) },
                },
                include: { genres: true, author: true },
            });
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
        return this.prisma.book.findMany({
            where: {
                author: { is: { deletedAt: null, id: authorId } },
                genres: genre ? { some: { name: genre } } : undefined,
                title: { contains: title },
                publicationDate,
                isbn,
            },
            include: { author: true, genres: { orderBy: { name: "asc" } } },
            take: perPage,
            skip: (page - 1) * perPage,
        });
    }

    async findOne(id: string): Promise<Book> {
        const book = await this.prisma.book.findUnique({
            where: { id, author: { is: { deletedAt: null } } },
            include: { genres: true, author: true },
        });
        this.assertExists(book);

        return book;
    }

    async update(id: string, dto: UpdateBookDto): Promise<Book> {
        return await this.prisma.$transaction(async tx => {
            const book = await tx.book.findUnique({ where: { id, author: { is: { deletedAt: null } } } });
            this.assertExists(book);

            if (dto.isbn && dto.isbn !== book.isbn) await this.assertIsbnIsAvailable(dto.isbn, tx);
            if (dto.authorId) {
                const exists = await tx.author.findUnique({
                    where: { id: dto.authorId, deletedAt: null },
                    select: { id: true },
                });
                if (!exists) throw new NotFoundException("There is no author with the provided ID");
            }

            const genres = dto.genres && (await this.persistManyGenresByName(dto.genres, tx));

            return await tx.book.update({
                where: { id },
                data: {
                    ...dto,
                    genres: {
                        set: genres ? [] : undefined,
                        connectOrCreate: genres?.map(genre => ({ create: genre, where: { id: genre.id } })),
                    },
                },
                include: { author: true, genres: true },
            });
        });
    }

    async remove(id: string): Promise<void> {
        const book = await this.prisma.book.findUnique({ where: { id, author: { is: { deletedAt: null } } } });
        this.assertExists(book);

        await this.prisma.book.delete({ where: { id } });
    }
}
