import { Book } from "./book.entity.js";

export class Genre {
    id: string;
    name: string;
    createdAt: Date;
    updatedAt: Date;
    books: Book[];
}
