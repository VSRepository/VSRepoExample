import { Injectable } from "@nestjs/common";
import { VSRepositoryBase } from "@vsrepo/nestjs";
import { DynamicMethod, EnableSoftDelete } from "vsrepo";
import { Author } from "./entities/author.entity.js";
import { OrmTypes } from "../../common/types/orm-types.type.js";

@Injectable()
@EnableSoftDelete()
export class AuthorRepository extends VSRepositoryBase<Author, string, OrmTypes>() {
    @DynamicMethod()
    declare existsByNameAndBirthDateAndNationality: (
        name: string,
        birthDate: Date,
        nationality: string,
    ) => Promise<boolean>;
}
