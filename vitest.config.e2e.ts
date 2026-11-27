import "dotenv/config.js";
import { defineConfig } from "vitest/config";
import { resolveTestDatabaseUrl } from "./test/setup/test-database.js";

// Fails fast (and never touches DATABASE_URL) if TEST_DATABASE_URL is missing or equals DATABASE_URL.
const testDatabaseUrl = resolveTestDatabaseUrl();

export default defineConfig({
    resolve: { tsconfigPaths: true },
    test: {
        globals: true,
        root: "./",
        include: ["**/*.e2e-spec.ts"],
        // The app under test reads DATABASE_URL, so the workers get the test database in its place.
        env: { DATABASE_URL: testDatabaseUrl, TEST_DATABASE_URL: testDatabaseUrl },
        fileParallelism: false,
        hookTimeout: 60_000,
        testTimeout: 30_000,
    },
});
