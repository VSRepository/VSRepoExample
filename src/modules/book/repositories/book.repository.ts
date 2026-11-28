import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../infra/prisma/prisma.service.js";
import {
    BookGetPayload,
    BookInclude,
    BookUncheckedCreateInput,
    BookUpdateInput,
    BookWhereInput,
} from "../../../generated/prisma/models.js";
import { Prisma } from "../../../generated/prisma/client.js";
import { TxOptions } from "../../../common/types/tx-options.type.js";

@Injectable()
export class BookRepository {
    constructor(private readonly prisma: PrismaService) {}

    async findOneByIdAndAuthorWithDeletedAtNull<T extends BookInclude = {}>(
        id: string,
        options?: TxOptions & { include?: T },
    ): Promise<BookGetPayload<{ include: T }> | null> {
        const prisma = options?.tx ?? this.prisma;

        return prisma.book.findUnique({
            where: { id, author: { is: { deletedAt: null } } },
            include: options?.include!,
        });
    }

    async deleteById(id: string, options?: TxOptions): Promise<number> {
        const prisma = options?.tx ?? this.prisma;

        return prisma.$executeRawUnsafe<number>('delete from "Book" where id = ?', id);
    }

    async patch<T extends BookInclude = {}>(
        id: string,
        data: BookUpdateInput,
        options?: TxOptions & { include?: T },
    ): Promise<BookGetPayload<{ include: T }>> {
        const prisma = options?.tx ?? this.prisma;

        return prisma.book.update({ where: { id }, data, include: options?.include! });
    }

    async transaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
        return this.prisma.$transaction(fn);
    }

    async existsByIsbn(isbn: string, options?: TxOptions): Promise<boolean> {
        const prisma = options?.tx ?? this.prisma;

        const exists = await prisma.book.findUnique({ where: { isbn }, select: { id: true } });
        return !!exists;
    }

    async save<T extends BookInclude = {}>(
        data: BookUncheckedCreateInput,
        options?: TxOptions & { include?: T },
    ): Promise<BookGetPayload<{ include: T }>> {
        const prisma = options?.tx ?? this.prisma;

        return prisma.book.create({ data, include: options?.include! });
    }

    async find<T extends BookInclude = {}>(
        where?: BookWhereInput,
        { include, skip, take, tx }: TxOptions & { include?: T; skip?: number; take?: number } = {},
    ): Promise<BookGetPayload<{ include: T }>[]> {
        const prisma = tx ?? this.prisma;

        return prisma.book.findMany({ where, include: include!, skip, take });
    }
}
