import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { CreateAuthorDto } from "./dto/create-author.dto.js";
import { UpdateAuthorDto } from "./dto/update-author.dto.js";
import { SearchAuthorQueryDto } from "./dto/search-author-query.dto.js";
import { Visibility } from "../../common/enums/visibility.enum.js";
import { PrismaService } from "../../infra/prisma/prisma.service.js";
import { Author } from "../../generated/prisma/client.js";

@Injectable()
export class AuthorService {
    constructor(private readonly prisma: PrismaService) {}

    private assertExists<T>(author: T): asserts author is NonNullable<T> {
        if (!author) throw new NotFoundException("Author not found");
    }

    private async assertAuthorIsNotDuplicated(name: string, birthDate: Date, nationality: string): Promise<void> {
        const exists = await this.prisma.author.findFirst({
            where: { name, birthDate, nationality, deletedAt: null },
            select: { id: true },
        });

        if (exists) throw new ConflictException("Author already registered");
    }

    async create(dto: CreateAuthorDto): Promise<Author> {
        if (dto.birthDate && dto.nationality) {
            await this.assertAuthorIsNotDuplicated(dto.name, dto.birthDate, dto.nationality);
        }

        return this.prisma.author.create({ data: dto });
    }

    async findAll({
        name,
        page,
        perPage,
        nationality,
        visibility,
        maxBirthDate,
        minBirthDate,
    }: SearchAuthorQueryDto): Promise<Author[]> {
        return this.prisma.author.findMany({
            where: {
                name: { contains: name },
                nationality: { contains: nationality },
                birthDate: { gte: minBirthDate, lte: maxBirthDate },
                deletedAt:
                    visibility === Visibility.ACTIVE
                        ? null
                        : visibility === Visibility.REMOVED
                          ? { not: null }
                          : undefined,
            },
            take: perPage,
            skip: (page - 1) * perPage,
        });
    }

    async findOne(id: string): Promise<Author> {
        const author = await this.prisma.author.findUnique({ where: { id, deletedAt: null } });
        this.assertExists(author);

        return author;
    }

    async update(id: string, dto: UpdateAuthorDto): Promise<Author> {
        const author = await this.prisma.author.findUnique({ where: { id, deletedAt: null } });
        this.assertExists(author);

        const finalName = dto.name ?? author.name;
        const finalBirthDate = dto.birthDate !== undefined ? dto.birthDate : author.birthDate;
        const finalNationality = dto.nationality !== undefined ? dto.nationality : author.nationality;

        if (
            finalBirthDate &&
            finalNationality &&
            (finalName !== author.name ||
                finalBirthDate.toLocaleDateString() !== author.birthDate?.toLocaleDateString() ||
                finalNationality !== author.nationality)
        ) {
            await this.assertAuthorIsNotDuplicated(finalName, finalBirthDate, finalNationality);
        }

        return this.prisma.author.update({ where: { id, deletedAt: null }, data: dto });
    }

    async remove(id: string): Promise<void> {
        const author = await this.prisma.author.findUnique({ where: { id, deletedAt: null } });
        this.assertExists(author);

        await this.prisma.author.update({ where: { id }, data: { deletedAt: new Date() } });
    }

    async recover(id: string): Promise<void> {
        const author = await this.prisma.author.findUnique({ where: { id, deletedAt: { not: null } } });
        this.assertExists(author);

        await this.prisma.author.update({ where: { id }, data: { deletedAt: null } });
    }
}
