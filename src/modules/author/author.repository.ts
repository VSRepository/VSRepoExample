import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../infra/prisma/prisma.service.js";
import { Author, Prisma } from "../../generated/prisma/client.js";
import { AuthorCreateInput, AuthorUpdateInput } from "../../generated/prisma/models.js";
import { TxOptions } from "../../common/types/tx-options.type.js";

@Injectable()
export class AuthorRepository {
    constructor(private readonly prisma: PrismaService) {}

    async has(id: string, options?: TxOptions): Promise<boolean> {
        const prisma = options?.tx ?? this.prisma;

        const exists = await prisma.author.findUnique({ where: { id, deletedAt: null }, select: { id: true } });
        return !!exists;
    }

    async save(data: AuthorCreateInput, options?: TxOptions): Promise<Author> {
        const prisma = options?.tx ?? this.prisma;

        return prisma.author.create({ data });
    }

    async get(
        id: string,
        options: TxOptions & { see: "all" | "removed" | "active" } = { see: "active" },
    ): Promise<Author | null> {
        const prisma = options?.tx ?? this.prisma;

        return prisma.author.findUnique({
            where: {
                id,
                deletedAt: options.see === "active" ? null : options.see === "removed" ? { not: null } : undefined,
            },
        });
    }

    async patch(id: string, data: AuthorUpdateInput, options?: TxOptions): Promise<Author> {
        const prisma = options?.tx ?? this.prisma;

        return prisma.author.update({ where: { id, deletedAt: null }, data });
    }

    async execute<T = any>(query: Prisma.Sql, options?: TxOptions): Promise<T> {
        const prisma = options?.tx ?? this.prisma;

        return prisma.$queryRaw<T>`${query}`;
    }

    async softRemove(id: string, options?: TxOptions): Promise<Author> {
        const prisma = options?.tx ?? this.prisma;

        return prisma.author.update({ where: { id }, data: { deletedAt: new Date() } });
    }

    async recover(id: string, options?: TxOptions): Promise<Author> {
        const prisma = options?.tx ?? this.prisma;

        return prisma.author.update({ where: { id }, data: { deletedAt: null } });
    }

    async existsByNameAndBirthDateAndNationality(
        name: string,
        birthDate: Date,
        nationality: string,
        options?: TxOptions,
    ): Promise<boolean> {
        const prisma = options?.tx ?? this.prisma;

        const exists = await prisma.author.findUnique({
            where: { name_birthDate_nationality: { birthDate, name, nationality }, deletedAt: null },
            select: { id: true },
        });
        return !!exists;
    }
}
