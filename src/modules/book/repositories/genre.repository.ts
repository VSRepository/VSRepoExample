import { Injectable } from "@nestjs/common";
import { InjectAdapter } from "@vsrepo/nestjs";
import { Genre } from "../entities/genre.entity.js";
import { DynamicMethod, MethodOptions, VSRepoAdapter, VSRepository } from "vsrepo";
import { OrmTypes } from "../../../common/types/orm-types.type.js";

@Injectable()
export class GenreRepository extends VSRepository<Genre, string, OrmTypes> {
    constructor(@InjectAdapter("Genre") adapter: VSRepoAdapter<Genre>) {
        super({ adapter });
    }

    @DynamicMethod()
    declare findGenresByNameIn: (names: string[], options?: MethodOptions<Genre, OrmTypes>) => Promise<Genre[]>;
}
