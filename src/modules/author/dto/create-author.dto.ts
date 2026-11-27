import { IsDate, IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";
import { Type } from "class-transformer";

export class CreateAuthorDto {
    @IsString()
    @MaxLength(150)
    @IsNotEmpty()
    name: string;

    @IsOptional()
    @Type(() => Date)
    @IsDate()
    birthDate?: Date | null;

    @IsOptional()
    @MaxLength(100)
    @IsNotEmpty()
    nationality?: string | null;
}
