import path from "node:path";

/**
 * Turns a SQLite URL (`file:./test.db`) into an absolute path so two different spellings of the same file compare equal.
 */
function resolveSqlitePath(url: string): string {
    return path.resolve(process.cwd(), url.replace(/^file:/, ""));
}

/**
 * Returns the URL of the database used by the E2E suite (`TEST_DATABASE_URL`).
 *
 * Throws if it is missing or if it points to the same database as `DATABASE_URL`, because every E2E test wipes the
 * data tables.
 */
export function resolveTestDatabaseUrl(env: NodeJS.ProcessEnv = process.env): string {
    const testUrl = env.TEST_DATABASE_URL?.trim();

    if (!testUrl) {
        throw new Error(
            'TEST_DATABASE_URL is not set. Define it in your .env (e.g. TEST_DATABASE_URL="file:./test.db") ' +
                "to run the E2E tests.",
        );
    }

    const devUrl = env.DATABASE_URL?.trim();

    if (devUrl && (devUrl === testUrl || resolveSqlitePath(devUrl) === resolveSqlitePath(testUrl))) {
        throw new Error(
            "TEST_DATABASE_URL must not point to the same database as DATABASE_URL: the E2E tests delete all data.",
        );
    }

    return testUrl;
}
