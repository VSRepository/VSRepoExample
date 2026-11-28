import { Injectable } from "@nestjs/common";
import { Genre } from "../entities/genre.entity.js";
import { PrismaService } from "../../../infra/prisma/prisma.service.js";
import { GenreCreateManyInput } from "../../../generated/prisma/models.js";
import { TxOptions } from "../../../common/types/tx-options.type.js";

@Injectable()
export class GenreRepository {
    constructor(private readonly prisma: PrismaService) {}

    async createManyReturning(data: GenreCreateManyInput[], options?: TxOptions): Promise<Genre[]> {
        const prisma = options?.tx ?? this.prisma;

        return prisma.genre.createManyAndReturn({ data });
    }

    async findGenresByNameIn(names: string[], options?: TxOptions): Promise<Genre[]> {
        const prisma = options?.tx ?? this.prisma;

        return prisma.genre.findMany({ where: { name: { in: names } } });
    }
}
