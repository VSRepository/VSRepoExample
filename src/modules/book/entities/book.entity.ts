import { Author } from "../../author/entities/author.entity.js";
import { Genre } from "./genre.entity.js";

export class Book {
    id: string;
    title: string;
    subtitle: string | null;
    description: string | null;
    isbn: string | null;
    publicationDate: Date | null;
    authorId: string;
    createdAt: Date;
    updatedAt: Date;
    author: Author;
    genres: Genre[];
}
