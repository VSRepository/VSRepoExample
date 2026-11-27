import { Book } from "../../book/entities/book.entity.js";

export class Author {
    id: string;
    name: string;
    birthDate: Date | null;
    nationality: string | null;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
    books: Book[];
}
