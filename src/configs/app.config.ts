import { registerAs } from "@nestjs/config";
import { VSLogLevel } from "vsrepo";

export default registerAs("app", () => ({
    databaseUrl: process.env.DATABASE_URL!,
    vsLogLevel: VSLogLevel[(process.env.VS_LOG_LEVEL as keyof typeof VSLogLevel) ?? "INFO"],
}));
