import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsOptional, IsString, MaxLength } from "class-validator";

export class CreateVocabCategoryDto {
  @ApiProperty({ example: "greetings" })
  @IsString()
  @MaxLength(60)
  key!: string;

  @ApiProperty({ example: "Sapaan" })
  @IsString()
  @MaxLength(120)
  name!: string;
}

export class UpdateVocabCategoryDto {
  @ApiPropertyOptional({ example: "Sapaan" })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
