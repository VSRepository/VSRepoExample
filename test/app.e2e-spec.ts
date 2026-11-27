import request from "supertest";
import { createTestApp, type TestApp } from "./utils/create-test-app.js";

describe("App (e2e)", () => {
    let testApp: TestApp;

    beforeAll(async () => {
        testApp = await createTestApp();
    });

    afterAll(async () => {
        await testApp.app.close();
    });

    it("GET / returns Hello World!", async () => {
        const res = await request(testApp.app.getHttpServer()).get("/").expect(200);

        expect(res.text).toBe("Hello World!");
    });

    it("GET /unknown returns 404 in the error format of the app", async () => {
        const res = await request(testApp.app.getHttpServer()).get("/unknown").expect(404);

        expect(res.body).toMatchObject({ statusCode: 404, path: "/unknown" });
        expect(typeof res.body.timestamp).toBe("string");
    });
});
