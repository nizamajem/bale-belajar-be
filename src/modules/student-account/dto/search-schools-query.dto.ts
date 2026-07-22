import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, MaxLength } from "class-validator";

export class SearchSchoolsQueryDto {
  @ApiPropertyOptional({ example: "Mataram" })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;
}
