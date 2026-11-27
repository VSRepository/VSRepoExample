import { IsDate, IsEnum, IsNotEmpty, IsOptional, MaxLength } from "class-validator";
import { PaginationQueryDto } from "../../../common/dto/pagination-query.dto.js";
import { Type } from "class-transformer";
import { Visibility } from "../../../common/enums/visibility.enum.js";
import { ApiPropertyOptional } from "@nestjs/swagger";

export class SearchAuthorQueryDto extends PaginationQueryDto {
    @IsOptional()
    @IsNotEmpty()
    @MaxLength(150)
    name?: string;

    @IsOptional()
    @Type(() => Date)
    @IsDate()
    minBirthDate?: Date;

    @IsOptional()
    @Type(() => Date)
    @IsDate()
    maxBirthDate?: Date;

    @IsOptional()
    @MaxLength(100)
    @IsNotEmpty()
    nationality?: string;

    @ApiPropertyOptional({ enum: Visibility })
    @IsOptional()
    @IsEnum(Visibility)
    visibility = Visibility.ACTIVE;
}
