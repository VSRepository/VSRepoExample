import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { CreateAuthorDto } from "./dto/create-author.dto.js";
import { UpdateAuthorDto } from "./dto/update-author.dto.js";
import { AuthorRepository } from "./author.repository.js";
import { Author } from "./entities/author.entity.js";
import { SearchAuthorQueryDto } from "./dto/search-author-query.dto.js";
import { VSSql } from "vsrepo";
import { Visibility } from "../../common/enums/visibility.enum.js";

@Injectable()
export class AuthorService {
    constructor(private readonly authorRepository: AuthorRepository) {}

    private assertExists<T>(author: T): asserts author is NonNullable<T> {
        if (!author) throw new NotFoundException("Author not found");
    }

    private async assertAuthorIsNotDuplicated(name: string, birthDate: Date, nationality: string): Promise<void> {
        const exists = await this.authorRepository.existsByNameAndBirthDateAndNationality(name, birthDate, nationality);

        if (exists) throw new ConflictException("Author already registered");
    }

    async assertExistsById(id: string): Promise<void> {
        const exists = await this.authorRepository.has(id);
        if (!exists) throw new NotFoundException("There is no author with the provided ID");
    }

    async create(dto: CreateAuthorDto): Promise<Author> {
        if (dto.birthDate && dto.nationality) {
            await this.assertAuthorIsNotDuplicated(dto.name, dto.birthDate, dto.nationality);
        }

        return this.authorRepository.save(dto);
    }

    async findAll({
        name,
        page,
        perPage,
        nationality,
        visibility,
        maxBirthDate,
        minBirthDate,
    }: SearchAuthorQueryDto): Promise<Author[]> {
        const qb = this.authorRepository
            .createRawQueryBuilder()
            .select("*")
            .from("Author")
            .limit(perPage)
            .offset((page - 1) * perPage);

        switch (visibility) {
            case Visibility.ACTIVE:
                qb.where("deletedAt is null");
                break;
            case Visibility.REMOVED:
                qb.where("deletedAt is not null");
                break;
        }

        if (name) qb.andWhere(VSSql.sql`name like ${"%" + name + "%"}`);
        if (nationality) qb.andWhere(VSSql.sql`nationality like ${"%" + nationality + "%"}`);
        if (minBirthDate) qb.andWhere(VSSql.sql`birthDate >= ${minBirthDate}`);
        if (maxBirthDate) qb.andWhere(VSSql.sql`birthDate <= ${maxBirthDate}`);

        return qb.execute<Author[]>();

        // Ou simplesmente:
        //
        // return this.authorRepository.find(
        //     {
        //         name: { contains: name },
        //         nationality: { contains: nationality },
        //         birthDate: { gte: minBirthDate, lte: maxBirthDate },
        //     },
        //     { pagination: { limit: perPage, offset: (page - 1) * perPage }, see: visibility },
        // );
    }

    async findOne(id: string): Promise<Author> {
        const author = await this.authorRepository.get(id);
        this.assertExists(author);

        return author;
    }

    async update(id: string, dto: UpdateAuthorDto): Promise<Author> {
        const author = await this.authorRepository.get(id);
        this.assertExists(author);

        const finalName = dto.name ?? author.name;
        const finalBirthDate = dto.birthDate !== undefined ? dto.birthDate : author.birthDate;
        const finalNationality = dto.nationality !== undefined ? dto.nationality : author.nationality;

        if (
            finalBirthDate &&
            finalNationality &&
            (finalName !== author.name ||
                finalBirthDate.toLocaleDateString() !== author.birthDate?.toLocaleDateString() ||
                finalNationality !== author.nationality)
        ) {
            await this.assertAuthorIsNotDuplicated(finalName, finalBirthDate, finalNationality);
        }

        return this.authorRepository.patch(id, dto);
    }

    async remove(id: string): Promise<void> {
        const author = await this.authorRepository.get(id);
        this.assertExists(author);

        await this.authorRepository.softRemove(id);
    }

    async recover(id: string): Promise<void> {
        const author = await this.authorRepository.get(id, { see: "removed" });
        this.assertExists(author);

        await this.authorRepository.recover(id);
    }
}
