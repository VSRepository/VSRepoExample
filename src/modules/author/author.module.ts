import { Module } from "@nestjs/common";
import { AuthorService } from "./author.service.js";
import { AuthorController } from "./author.controller.js";
import { AuthorRepository } from "./author.repository.js";

@Module({
    controllers: [AuthorController],
    providers: [AuthorService, AuthorRepository],
    exports: [AuthorService],
})
export class AuthorModule {}
