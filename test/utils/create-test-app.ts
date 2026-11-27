import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { AppModule } from "../../src/app.module.js";
import { PrismaService } from "../../src/infra/prisma/prisma.service.js";

export interface TestApp {
    app: INestApplication;
    prisma: PrismaService;
}

export async function createTestApp(): Promise<TestApp> {
    // Last line of defense: these tests delete data, so they must only ever run against the test database.
    if (!process.env.TEST_DATABASE_URL || process.env.DATABASE_URL !== process.env.TEST_DATABASE_URL) {
        throw new Error("E2E tests must run through `bun run test:e2e` (DATABASE_URL must equal TEST_DATABASE_URL).");
    }

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();

    const app = moduleRef.createNestApplication();
    await app.init();

    return { app, prisma: app.get(PrismaService) };
}

/**
 * Empties every data table. The schema (and the migrations table) is left untouched.
 */
export async function clearDatabase(prisma: PrismaService): Promise<void> {
    await prisma.book.deleteMany(); // also removes the _BookToGenre rows (ON DELETE CASCADE)
    await prisma.genre.deleteMany();
    await prisma.author.deleteMany();
}
