import type { INestApplication } from "@nestjs/common";
import request from "supertest";

export const NON_EXISTENT_ID = "00000000-0000-4000-8000-000000000000";

export async function createAuthor(app: INestApplication, data: Record<string, unknown> = {}) {
    const res = await request(app.getHttpServer())
        .post("/author")
        .send({ name: "Machado de Assis", ...data })
        .expect(201);

    return res.body as {
        id: string;
        name: string;
        birthDate: string | null;
        nationality: string | null;
        deletedAt: string | null;
    };
}

export async function createBook(app: INestApplication, authorId: string, data: Record<string, unknown> = {}) {
    const res = await request(app.getHttpServer())
        .post("/book")
        .send({ title: "Dom Casmurro", authorId, genres: ["Romance"], ...data })
        .expect(201);

    return res.body as {
        id: string;
        title: string;
        isbn: string | null;
        authorId: string;
        author: { id: string; name: string };
        genres: { id: string; name: string }[];
    };
}
