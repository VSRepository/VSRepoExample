import { Transform, Type } from "class-transformer";
import {
    ArrayMaxSize,
    IsArray,
    IsDate,
    IsISBN,
    IsNotEmpty,
    IsOptional,
    IsString,
    IsUUID,
    MaxLength,
} from "class-validator";
import { NormalizeISBN } from "../../../common/decorators/normalize-isbn.decorator.js";

export class CreateBookDto {
    @IsOptional()
    @IsISBN()
    @NormalizeISBN()
    isbn?: string | null;

    @IsString()
    @IsNotEmpty()
    @MaxLength(200)
    title: string;

    @IsOptional()
    @IsString()
    @IsNotEmpty()
    @MaxLength(300)
    subtitle?: string | null;

    @IsOptional()
    @IsString()
    @IsNotEmpty()
    @MaxLength(5000)
    description?: string | null;

    @IsOptional()
    @Type(() => Date)
    @IsDate()
    publicationDate?: Date | null;

    @IsUUID()
    authorId: string;

    @IsArray()
    @ArrayMaxSize(20)
    @IsString({ each: true })
    @IsNotEmpty({ each: true })
    @MaxLength(30, { each: true })
    @Transform(({ value }) => (Array.isArray(value) ? [...new Set(value)] : value))
    genres: string[];
}
