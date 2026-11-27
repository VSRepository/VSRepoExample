import { Module } from "@nestjs/common";
import { AuthorService } from "./author.service.js";
import { AuthorController } from "./author.controller.js";
import { VSRepositoryModule } from "@vsrepo/nestjs";
import { Prisma7Adapter } from "@vsrepo/prisma7-adapter";
import { Author } from "./entities/author.entity.js";
import { AuthorRepository } from "./author.repository.js";

@Module({
    imports: [VSRepositoryModule.forFeature<Prisma7Adapter<Author>>({ modelName: "author", pkName: "id" })],
    controllers: [AuthorController],
    providers: [AuthorService, AuthorRepository],
    exports: [AuthorService],
})
export class AuthorModule {}
