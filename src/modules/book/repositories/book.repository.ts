import { Injectable } from "@nestjs/common";
import { VSRepositoryBase } from "@vsrepo/nestjs";
import { Book } from "../entities/book.entity.js";
import { DynamicMethod, MethodOptions, QueryMethod } from "vsrepo";
import { OrmTypes } from "../../../common/types/orm-types.type.js";

@Injectable()
export class BookRepository extends VSRepositoryBase<Book, string, OrmTypes>({ entityName: "Book" }) {
    @DynamicMethod()
    declare existsByIsbn: (isbn: string) => Promise<boolean>;

    /**
     * Só encontra o livro se o autor não foi deletado.
     */
    @DynamicMethod()
    declare findOneByIdAndAuthorWithDeletedAtNull: (
        id: string,
        options?: MethodOptions<Book, OrmTypes>,
    ) => Promise<Book | null>;

    @QueryMethod('delete from "Book" where id = ?1', { modifying: true })
    declare deleteById: (id: string) => Promise<number>;
}
