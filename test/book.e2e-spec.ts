import request from "supertest";
import { clearDatabase, createTestApp, type TestApp } from "./utils/create-test-app.js";
import { createAuthor, createBook, NON_EXISTENT_ID } from "./utils/factories.js";

// Valid ISBN-13 values (with and without hyphens) and a valid ISBN-10 ending in X.
const ISBN_A = "978-3-16-148410-0";
const ISBN_A_NORMALIZED = "9783161484100";
const ISBN_B = "9780306406157";
const ISBN_10_X = "080442957X";

describe("Book (e2e)", () => {
    let testApp: TestApp;
    let http: ReturnType<TestApp["app"]["getHttpServer"]>;
    let authorId: string;

    beforeAll(async () => {
        testApp = await createTestApp();
        http = testApp.app.getHttpServer();
    });

    afterAll(async () => {
        await clearDatabase(testApp.prisma);
        await testApp.app.close();
    });

    beforeEach(async () => {
        await clearDatabase(testApp.prisma);
        authorId = (await createAuthor(testApp.app)).id;
    });

    describe("POST /book", () => {
        it("creates a book with the author and the genres", async () => {
            const res = await request(http)
                .post("/book")
                .send({
                    title: "Dom Casmurro",
                    subtitle: "A novel",
                    description: "A classic",
                    isbn: ISBN_A,
                    publicationDate: "1899-01-01",
                    authorId,
                    genres: ["Romance", "Classic"],
                })
                .expect(201);

            expect(res.body).toMatchObject({
                title: "Dom Casmurro",
                subtitle: "A novel",
                description: "A classic",
                isbn: ISBN_A_NORMALIZED,
                authorId,
                author: { id: authorId, name: "Machado de Assis" },
            });
            expect(new Date(res.body.publicationDate).toISOString()).toBe("1899-01-01T00:00:00.000Z");
            expect(res.body.genres.map((g: { name: string }) => g.name).sort()).toEqual(["Classic", "Romance"]);

            const saved = await testApp.prisma.book.findUnique({
                where: { id: res.body.id },
                include: { genres: true },
            });
            expect(saved?.isbn).toBe(ISBN_A_NORMALIZED);
            expect(saved?.genres).toHaveLength(2);
        });

        it("creates a book with only the required fields", async () => {
            const res = await request(http).post("/book").send({ title: "Minimal", authorId, genres: [] }).expect(201);

            expect(res.body).toMatchObject({ title: "Minimal", subtitle: null, description: null, isbn: null });
            expect(res.body.genres).toEqual([]);
        });

        it("normalizes the ISBN (hyphens removed, X uppercased)", async () => {
            const res = await request(http)
                .post("/book")
                .send({ title: "ISBN 10", authorId, genres: [], isbn: "0-8044-2957-x" })
                .expect(201);

            expect(res.body.isbn).toBe(ISBN_10_X);
        });

        it("reuses genres that already exist and ignores duplicated names in the request", async () => {
            await createBook(testApp.app, authorId, { title: "First", genres: ["Romance"] });

            const res = await request(http)
                .post("/book")
                .send({ title: "Second", authorId, genres: ["Romance", "Romance", "Drama"] })
                .expect(201);

            expect(res.body.genres.map((g: { name: string }) => g.name).sort()).toEqual(["Drama", "Romance"]);
            expect(await testApp.prisma.genre.count()).toBe(2);
        });

        it("returns 409 when the ISBN is already used (even with different formatting)", async () => {
            await createBook(testApp.app, authorId, { isbn: ISBN_A });

            const res = await request(http)
                .post("/book")
                .send({ title: "Other", authorId, genres: [], isbn: ISBN_A_NORMALIZED })
                .expect(409);

            expect(res.body).toMatchObject({
                statusCode: 409,
                message: "There is already a book with this ISBN",
            });
            expect(await testApp.prisma.book.count()).toBe(1);
        });

        it("returns 404 when the author does not exist and does not persist anything", async () => {
            const res = await request(http)
                .post("/book")
                .send({ title: "Orphan", authorId: NON_EXISTENT_ID, genres: ["Ghost genre"] })
                .expect(404);

            expect(res.body.message).toBe("There is no author with the provided ID");
            expect(await testApp.prisma.book.count()).toBe(0);
            expect(await testApp.prisma.genre.count()).toBe(0);
        });

        it("rolls back the genres created in the request when the ISBN is rejected", async () => {
            await createBook(testApp.app, authorId, { isbn: ISBN_A, genres: ["Romance"] });

            await request(http)
                .post("/book")
                .send({ title: "Dup", authorId, genres: ["Brand new genre"], isbn: ISBN_A })
                .expect(409);

            expect(await testApp.prisma.genre.findUnique({ where: { name: "Brand new genre" } })).toBeNull();
        });

        it.each([
            ["a missing title", { genres: [] }],
            ["an empty title", { title: "", genres: [] }],
            ["a title longer than 200 characters", { title: "a".repeat(201), genres: [] }],
            ["a missing authorId", { title: "X", genres: [], authorId: undefined }],
            ["a non-UUID authorId", { title: "X", authorId: "nope", genres: [] }],
            ["missing genres", { title: "X" }],
            ["genres that are not an array", { title: "X", genres: "Romance" }],
            ["an empty genre name", { title: "X", genres: [""] }],
            ["a genre name longer than 30 characters", { title: "X", genres: ["a".repeat(31)] }],
            ["more than 20 genres", { title: "X", genres: Array.from({ length: 21 }, (_, i) => `g${i}`) }],
            ["an invalid ISBN", { title: "X", genres: [], isbn: "123" }],
            ["an invalid publication date", { title: "X", genres: [], publicationDate: "nope" }],
            ["properties that are not part of the DTO", { title: "X", genres: [], unknown: true }],
        ])("returns 400 for %s", async (_label, body) => {
            const payload = { authorId, ...body };

            await request(http).post("/book").send(payload).expect(400);

            expect(await testApp.prisma.book.count()).toBe(0);
        });
    });

    describe("GET /book", () => {
        it("returns an empty list when there are no books", async () => {
            const res = await request(http).get("/book").expect(200);

            expect(res.body).toEqual([]);
        });

        it("lists the books with their author and genres (sorted by name)", async () => {
            await createBook(testApp.app, authorId, { title: "A book", genres: ["Zeta", "Alpha", "Mu"] });

            const res = await request(http).get("/book").expect(200);

            expect(res.body).toHaveLength(1);
            expect(res.body[0]).toMatchObject({ title: "A book", author: { id: authorId } });
            expect(res.body[0].genres.map((g: { name: string }) => g.name)).toEqual(["Alpha", "Mu", "Zeta"]);
        });

        it("paginates the results", async () => {
            for (let i = 1; i <= 5; i++) await createBook(testApp.app, authorId, { title: `Book ${i}`, genres: [] });

            const page1 = await request(http).get("/book").query({ page: 1, perPage: 2 }).expect(200);
            const page2 = await request(http).get("/book").query({ page: 2, perPage: 2 }).expect(200);
            const page3 = await request(http).get("/book").query({ page: 3, perPage: 2 }).expect(200);

            expect([page1.body.length, page2.body.length, page3.body.length]).toEqual([2, 2, 1]);

            const ids = [...page1.body, ...page2.body, ...page3.body].map((b: { id: string }) => b.id);
            expect(new Set(ids).size).toBe(5);
        });

        it("filters by title (partial match)", async () => {
            await createBook(testApp.app, authorId, { title: "Dom Casmurro", genres: [] });
            await createBook(testApp.app, authorId, { title: "Memórias Póstumas", genres: [] });

            const res = await request(http).get("/book").query({ title: "Casmurro" }).expect(200);

            expect(res.body.map((b: { title: string }) => b.title)).toEqual(["Dom Casmurro"]);
        });

        it("filters by ISBN", async () => {
            await createBook(testApp.app, authorId, { title: "With A", isbn: ISBN_A, genres: [] });
            await createBook(testApp.app, authorId, { title: "With B", isbn: ISBN_B, genres: [] });

            const res = await request(http).get("/book").query({ isbn: ISBN_A }).expect(200);

            expect(res.body.map((b: { title: string }) => b.title)).toEqual(["With A"]);
        });

        it("filters by author", async () => {
            const other = await createAuthor(testApp.app, { name: "Clarice Lispector" });
            await createBook(testApp.app, authorId, { title: "By Machado", genres: [] });
            await createBook(testApp.app, other.id, { title: "By Clarice", genres: [] });

            const res = await request(http).get("/book").query({ authorId: other.id }).expect(200);

            expect(res.body.map((b: { title: string }) => b.title)).toEqual(["By Clarice"]);
        });

        it("filters by genre", async () => {
            await createBook(testApp.app, authorId, { title: "Romantic", genres: ["Romance", "Classic"] });
            await createBook(testApp.app, authorId, { title: "Scary", genres: ["Horror"] });

            const res = await request(http).get("/book").query({ genre: "Romance" }).expect(200);

            expect(res.body.map((b: { title: string }) => b.title)).toEqual(["Romantic"]);
        });

        it("filters by publication date", async () => {
            await createBook(testApp.app, authorId, { title: "Old", publicationDate: "1899-01-01", genres: [] });
            await createBook(testApp.app, authorId, { title: "New", publicationDate: "2020-05-05", genres: [] });

            const res = await request(http).get("/book").query({ publicationDate: "2020-05-05" }).expect(200);

            expect(res.body.map((b: { title: string }) => b.title)).toEqual(["New"]);
        });

        it("hides the books whose author was removed, and shows them again after the author is recovered", async () => {
            await createBook(testApp.app, authorId, { title: "Hidden" });
            await request(http).delete(`/author/${authorId}`).expect(204);

            expect((await request(http).get("/book").expect(200)).body).toEqual([]);

            await request(http).post(`/author/${authorId}/recover`).expect(204);

            const res = await request(http).get("/book").expect(200);
            expect(res.body.map((b: { title: string }) => b.title)).toEqual(["Hidden"]);
        });

        it.each([
            ["page=0", { page: 0 }],
            ["perPage=51", { perPage: 51 }],
            ["an invalid ISBN", { isbn: "123" }],
            ["a non-UUID authorId", { authorId: "nope" }],
            ["an invalid publicationDate", { publicationDate: "nope" }],
            ["an unknown query param", { foo: "bar" }],
        ])("returns 400 for %s", async (_label, query) => {
            await request(http).get("/book").query(query).expect(400);
        });
    });

    describe("GET /book/:id", () => {
        it("returns the book with the author and the genres", async () => {
            const book = await createBook(testApp.app, authorId, { genres: ["Romance", "Classic"] });

            const res = await request(http).get(`/book/${book.id}`).expect(200);

            expect(res.body).toMatchObject({ id: book.id, title: "Dom Casmurro", author: { id: authorId } });
            expect(res.body.genres.map((g: { name: string }) => g.name).sort()).toEqual(["Classic", "Romance"]);
        });

        it("returns 404 when the book does not exist", async () => {
            const res = await request(http).get(`/book/${NON_EXISTENT_ID}`).expect(404);

            expect(res.body).toMatchObject({ statusCode: 404, message: "Book not found" });
        });

        it("returns 404 when the author of the book was removed", async () => {
            const book = await createBook(testApp.app, authorId);
            await request(http).delete(`/author/${authorId}`).expect(204);

            await request(http).get(`/book/${book.id}`).expect(404);
        });

        it("returns 400 when the id is not a UUID", async () => {
            await request(http).get("/book/not-a-uuid").expect(400);
        });
    });

    describe("PATCH /book/:id", () => {
        it("updates only the provided fields and keeps the genres", async () => {
            const book = await createBook(testApp.app, authorId, { genres: ["Romance"], isbn: ISBN_A });

            const res = await request(http).patch(`/book/${book.id}`).send({ title: "New title" }).expect(200);

            expect(res.body).toMatchObject({ id: book.id, title: "New title", isbn: ISBN_A_NORMALIZED });
            expect(res.body.genres.map((g: { name: string }) => g.name)).toEqual(["Romance"]);
        });

        it("replaces the genres", async () => {
            const book = await createBook(testApp.app, authorId, { genres: ["Romance", "Classic"] });

            const res = await request(http)
                .patch(`/book/${book.id}`)
                .send({ genres: ["Classic", "Drama"] })
                .expect(200);

            expect(res.body.genres.map((g: { name: string }) => g.name).sort()).toEqual(["Classic", "Drama"]);

            const saved = await testApp.prisma.book.findUnique({ where: { id: book.id }, include: { genres: true } });
            expect(saved?.genres.map(g => g.name).sort()).toEqual(["Classic", "Drama"]);
        });

        it("moves the book to another author", async () => {
            const other = await createAuthor(testApp.app, { name: "Clarice Lispector" });
            const book = await createBook(testApp.app, authorId);

            const res = await request(http).patch(`/book/${book.id}`).send({ authorId: other.id }).expect(200);

            expect(res.body).toMatchObject({ authorId: other.id, author: { id: other.id } });
        });

        it("accepts the book's own ISBN again", async () => {
            const book = await createBook(testApp.app, authorId, { isbn: ISBN_A });

            await request(http).patch(`/book/${book.id}`).send({ isbn: ISBN_A, title: "Same ISBN" }).expect(200);
        });

        it("returns 409 when the ISBN belongs to another book", async () => {
            await createBook(testApp.app, authorId, { title: "First", isbn: ISBN_A });
            const second = await createBook(testApp.app, authorId, { title: "Second", isbn: ISBN_B });

            const res = await request(http).patch(`/book/${second.id}`).send({ isbn: ISBN_A }).expect(409);

            expect(res.body.message).toBe("There is already a book with this ISBN");
        });

        it("returns 404 when the new author does not exist", async () => {
            const book = await createBook(testApp.app, authorId);

            await request(http).patch(`/book/${book.id}`).send({ authorId: NON_EXISTENT_ID }).expect(404);

            const saved = await testApp.prisma.book.findUnique({ where: { id: book.id } });
            expect(saved?.authorId).toBe(authorId);
        });

        it("returns 404 when the book does not exist", async () => {
            await request(http).patch(`/book/${NON_EXISTENT_ID}`).send({ title: "X" }).expect(404);
        });

        it("returns 404 when the author of the book was removed", async () => {
            const book = await createBook(testApp.app, authorId);
            await request(http).delete(`/author/${authorId}`).expect(204);

            await request(http).patch(`/book/${book.id}`).send({ title: "X" }).expect(404);
        });

        it("returns 400 for an invalid body", async () => {
            const book = await createBook(testApp.app, authorId);

            await request(http).patch(`/book/${book.id}`).send({ title: "" }).expect(400);
            await request(http).patch(`/book/${book.id}`).send({ isbn: "123" }).expect(400);
            await request(http).patch(`/book/${book.id}`).send({ unknown: 1 }).expect(400);
        });

        it("returns 400 when the id is not a UUID", async () => {
            await request(http).patch("/book/not-a-uuid").send({ title: "X" }).expect(400);
        });
    });

    describe("DELETE /book/:id", () => {
        it("removes the book permanently, keeping the author and the genres", async () => {
            const book = await createBook(testApp.app, authorId, { genres: ["Romance"] });

            await request(http).delete(`/book/${book.id}`).expect(204);

            expect(await testApp.prisma.book.findUnique({ where: { id: book.id } })).toBeNull();
            expect(await testApp.prisma.author.findUnique({ where: { id: authorId } })).not.toBeNull();
            expect(await testApp.prisma.genre.count()).toBe(1);
            await request(http).get(`/book/${book.id}`).expect(404);
        });

        it("returns 404 when the book does not exist", async () => {
            await request(http).delete(`/book/${NON_EXISTENT_ID}`).expect(404);
        });

        it("returns 404 when the book was already removed", async () => {
            const book = await createBook(testApp.app, authorId);
            await request(http).delete(`/book/${book.id}`).expect(204);

            await request(http).delete(`/book/${book.id}`).expect(404);
        });

        it("returns 400 when the id is not a UUID", async () => {
            await request(http).delete("/book/not-a-uuid").expect(400);
        });
    });
});
