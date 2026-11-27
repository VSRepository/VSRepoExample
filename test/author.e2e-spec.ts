import request from "supertest";
import { clearDatabase, createTestApp, type TestApp } from "./utils/create-test-app.js";
import { createAuthor, NON_EXISTENT_ID } from "./utils/factories.js";

describe("Author (e2e)", () => {
    let testApp: TestApp;
    let http: ReturnType<TestApp["app"]["getHttpServer"]>;

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
    });

    describe("POST /author", () => {
        it("creates an author with only the required fields", async () => {
            const res = await request(http).post("/author").send({ name: "Clarice Lispector" }).expect(201);

            expect(res.body).toMatchObject({
                name: "Clarice Lispector",
                birthDate: null,
                nationality: null,
                deletedAt: null,
            });
            expect(res.body.id).toMatch(/^[0-9a-f-]{36}$/);

            const saved = await testApp.prisma.author.findUnique({ where: { id: res.body.id } });
            expect(saved?.name).toBe("Clarice Lispector");
        });

        it("creates an author with all the fields", async () => {
            const res = await request(http)
                .post("/author")
                .send({ name: "Machado de Assis", birthDate: "1839-06-21", nationality: "Brazilian" })
                .expect(201);

            expect(res.body).toMatchObject({ name: "Machado de Assis", nationality: "Brazilian" });
            expect(new Date(res.body.birthDate).toISOString()).toBe("1839-06-21T00:00:00.000Z");
        });

        it("returns 409 when the same name, birth date and nationality are already registered", async () => {
            const data = { name: "Machado de Assis", birthDate: "1839-06-21", nationality: "Brazilian" };
            await createAuthor(testApp.app, data);

            const res = await request(http).post("/author").send(data).expect(409);

            expect(res.body).toMatchObject({ statusCode: 409, message: "Author already registered" });
            expect(await testApp.prisma.author.count()).toBe(1);
        });

        it("allows the same name when the birth date or nationality differ", async () => {
            await createAuthor(testApp.app, { name: "João Silva", birthDate: "1900-01-01", nationality: "Brazilian" });
            await createAuthor(testApp.app, { name: "João Silva", birthDate: "1950-01-01", nationality: "Brazilian" });
            await createAuthor(testApp.app, { name: "João Silva", birthDate: "1900-01-01", nationality: "Portuguese" });

            expect(await testApp.prisma.author.count()).toBe(3);
        });

        it.each([
            ["a missing name", {}],
            ["an empty name", { name: "" }],
            ["a name longer than 150 characters", { name: "a".repeat(151) }],
            ["an invalid birth date", { name: "X", birthDate: "not-a-date" }],
            ["a nationality longer than 100 characters", { name: "X", nationality: "a".repeat(101) }],
            ["properties that are not part of the DTO", { name: "X", unknown: true }],
        ])("returns 400 for %s", async (_label, body) => {
            const res = await request(http).post("/author").send(body).expect(400);

            expect(res.body.statusCode).toBe(400);
            expect(await testApp.prisma.author.count()).toBe(0);
        });
    });

    describe("GET /author", () => {
        it("returns an empty list when there are no authors", async () => {
            const res = await request(http).get("/author").expect(200);

            expect(res.body).toEqual([]);
        });

        it("lists the authors", async () => {
            await createAuthor(testApp.app, { name: "Author A" });
            await createAuthor(testApp.app, { name: "Author B" });

            const res = await request(http).get("/author").expect(200);

            expect(res.body.map((a: { name: string }) => a.name).sort()).toEqual(["Author A", "Author B"]);
        });

        it("paginates the results", async () => {
            for (let i = 1; i <= 5; i++) await createAuthor(testApp.app, { name: `Author ${i}` });

            const page1 = await request(http).get("/author").query({ page: 1, perPage: 2 }).expect(200);
            const page2 = await request(http).get("/author").query({ page: 2, perPage: 2 }).expect(200);
            const page3 = await request(http).get("/author").query({ page: 3, perPage: 2 }).expect(200);

            expect(page1.body).toHaveLength(2);
            expect(page2.body).toHaveLength(2);
            expect(page3.body).toHaveLength(1);

            const ids = [...page1.body, ...page2.body, ...page3.body].map((a: { id: string }) => a.id);
            expect(new Set(ids).size).toBe(5);
        });

        it("filters by name (partial match)", async () => {
            await createAuthor(testApp.app, { name: "Machado de Assis" });
            await createAuthor(testApp.app, { name: "Clarice Lispector" });

            const res = await request(http).get("/author").query({ name: "Machado" }).expect(200);

            expect(res.body).toHaveLength(1);
            expect(res.body[0].name).toBe("Machado de Assis");
        });

        it("filters by nationality (partial match)", async () => {
            await createAuthor(testApp.app, { name: "A", nationality: "Brazilian" });
            await createAuthor(testApp.app, { name: "B", nationality: "Portuguese" });

            const res = await request(http).get("/author").query({ nationality: "Brazil" }).expect(200);

            expect(res.body.map((a: { name: string }) => a.name)).toEqual(["A"]);
        });

        it("filters by birth date range", async () => {
            await createAuthor(testApp.app, { name: "Old", birthDate: "1800-01-01", nationality: "X" });
            await createAuthor(testApp.app, { name: "Middle", birthDate: "1900-01-01", nationality: "X" });
            await createAuthor(testApp.app, { name: "Young", birthDate: "2000-01-01", nationality: "X" });

            const res = await request(http)
                .get("/author")
                .query({ minBirthDate: "1850-01-01", maxBirthDate: "1950-01-01" })
                .expect(200);

            expect(res.body.map((a: { name: string }) => a.name)).toEqual(["Middle"]);
        });

        describe("visibility", () => {
            let activeId: string;
            let removedId: string;

            beforeEach(async () => {
                activeId = (await createAuthor(testApp.app, { name: "Active" })).id;
                removedId = (await createAuthor(testApp.app, { name: "Removed" })).id;
                await request(http).delete(`/author/${removedId}`).expect(204);
            });

            it("only returns active authors by default", async () => {
                const res = await request(http).get("/author").expect(200);

                expect(res.body.map((a: { id: string }) => a.id)).toEqual([activeId]);
            });

            it("returns only the removed authors with visibility=removed", async () => {
                const res = await request(http).get("/author").query({ visibility: "removed" }).expect(200);

                expect(res.body.map((a: { id: string }) => a.id)).toEqual([removedId]);
                expect(res.body[0].deletedAt).not.toBeNull();
            });

            it("returns every author with visibility=all", async () => {
                const res = await request(http).get("/author").query({ visibility: "all" }).expect(200);

                expect(res.body.map((a: { id: string }) => a.id).sort()).toEqual([activeId, removedId].sort());
            });
        });

        it.each([
            ["page=0", { page: 0 }],
            ["page=abc", { page: "abc" }],
            ["perPage=51", { perPage: 51 }],
            ["an invalid visibility", { visibility: "nope" }],
            ["an invalid minBirthDate", { minBirthDate: "nope" }],
            ["an unknown query param", { foo: "bar" }],
        ])("returns 400 for %s", async (_label, query) => {
            await request(http).get("/author").query(query).expect(400);
        });
    });

    describe("GET /author/:id", () => {
        it("returns the author", async () => {
            const author = await createAuthor(testApp.app, { name: "Machado de Assis" });

            const res = await request(http).get(`/author/${author.id}`).expect(200);

            expect(res.body).toMatchObject({ id: author.id, name: "Machado de Assis" });
        });

        it("returns 404 when the author does not exist", async () => {
            const res = await request(http).get(`/author/${NON_EXISTENT_ID}`).expect(404);

            expect(res.body).toMatchObject({ statusCode: 404, message: "Author not found" });
        });

        it("returns 404 when the author was removed", async () => {
            const author = await createAuthor(testApp.app);
            await request(http).delete(`/author/${author.id}`).expect(204);

            await request(http).get(`/author/${author.id}`).expect(404);
        });

        it("returns 400 when the id is not a UUID", async () => {
            await request(http).get("/author/not-a-uuid").expect(400);
        });
    });

    describe("PATCH /author/:id", () => {
        it("updates only the provided fields", async () => {
            const author = await createAuthor(testApp.app, { name: "Old name", nationality: "Brazilian" });

            const res = await request(http).patch(`/author/${author.id}`).send({ name: "New name" }).expect(200);

            expect(res.body).toMatchObject({ id: author.id, name: "New name", nationality: "Brazilian" });

            const saved = await testApp.prisma.author.findUnique({ where: { id: author.id } });
            expect(saved?.name).toBe("New name");
        });

        it("can clear nullable fields", async () => {
            const author = await createAuthor(testApp.app, { birthDate: "1839-06-21", nationality: "Brazilian" });

            const res = await request(http)
                .patch(`/author/${author.id}`)
                .send({ birthDate: null, nationality: null })
                .expect(200);

            expect(res.body).toMatchObject({ birthDate: null, nationality: null });
        });

        it("returns 409 when the update would duplicate another author", async () => {
            await createAuthor(testApp.app, { name: "A", birthDate: "1900-01-01", nationality: "Brazilian" });
            const other = await createAuthor(testApp.app, {
                name: "B",
                birthDate: "1900-01-01",
                nationality: "Brazilian",
            });

            const res = await request(http).patch(`/author/${other.id}`).send({ name: "A" }).expect(409);

            expect(res.body.message).toBe("Author already registered");
        });

        it("returns 404 when the author does not exist", async () => {
            await request(http).patch(`/author/${NON_EXISTENT_ID}`).send({ name: "X" }).expect(404);
        });

        it("returns 400 for an invalid body", async () => {
            const author = await createAuthor(testApp.app);

            await request(http).patch(`/author/${author.id}`).send({ name: "" }).expect(400);
            await request(http).patch(`/author/${author.id}`).send({ unknown: 1 }).expect(400);
        });

        it("returns 400 when the id is not a UUID", async () => {
            await request(http).patch("/author/not-a-uuid").send({ name: "X" }).expect(400);
        });
    });

    describe("DELETE /author/:id", () => {
        it("soft deletes the author", async () => {
            const author = await createAuthor(testApp.app);

            await request(http).delete(`/author/${author.id}`).expect(204);

            const row = await testApp.prisma.author.findUnique({ where: { id: author.id } });
            expect(row).not.toBeNull();
            expect(row?.deletedAt).not.toBeNull();
        });

        it("returns 404 when the author does not exist", async () => {
            await request(http).delete(`/author/${NON_EXISTENT_ID}`).expect(404);
        });

        it("returns 404 when the author was already removed", async () => {
            const author = await createAuthor(testApp.app);
            await request(http).delete(`/author/${author.id}`).expect(204);

            await request(http).delete(`/author/${author.id}`).expect(404);
        });

        it("returns 400 when the id is not a UUID", async () => {
            await request(http).delete("/author/not-a-uuid").expect(400);
        });
    });

    describe("POST /author/:id/recover", () => {
        it("recovers a removed author", async () => {
            const author = await createAuthor(testApp.app);
            await request(http).delete(`/author/${author.id}`).expect(204);

            await request(http).post(`/author/${author.id}/recover`).expect(204);

            const res = await request(http).get(`/author/${author.id}`).expect(200);
            expect(res.body.deletedAt).toBeNull();
        });

        it("returns 404 when the author is not removed", async () => {
            const author = await createAuthor(testApp.app);

            await request(http).post(`/author/${author.id}/recover`).expect(404);
        });

        it("returns 404 when the author does not exist", async () => {
            await request(http).post(`/author/${NON_EXISTENT_ID}/recover`).expect(404);
        });

        it("returns 400 when the id is not a UUID", async () => {
            await request(http).post("/author/not-a-uuid/recover").expect(400);
        });
    });
});
