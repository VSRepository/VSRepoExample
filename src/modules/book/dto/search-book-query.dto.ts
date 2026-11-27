import { IsDate, IsISBN, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from "class-validator";
import { PaginationQueryDto } from "../../../common/dto/pagination-query.dto.js";
import { NormalizeISBN } from "../../../common/decorators/normalize-isbn.decorator.js";
import { Type } from "class-transformer";

export class SearchBookQueryDto extends PaginationQueryDto {
    @IsOptional()
    @IsISBN()
    @NormalizeISBN()
    isbn?: string;

    @IsOptional()
    @IsString()
    @IsNotEmpty()
    @MaxLength(200)
    title?: string;

    @IsOptional()
    @Type(() => Date)
    @IsDate()
    publicationDate?: Date;

    @IsOptional()
    @IsUUID()
    authorId?: string;

    @IsOptional()
    @IsString()
    @IsNotEmpty()
    @MaxLength(30)
    genre?: string;
}
