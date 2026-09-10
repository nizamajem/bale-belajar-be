import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { VocabLevel } from "@prisma/client";
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from "class-validator";

export class CreateVocabWordDto {
  @ApiProperty()
  @IsUUID()
  categoryId!: string;

  @ApiProperty({ example: "hello" })
  @IsString()
  @MaxLength(200)
  english!: string;

  @ApiProperty({ example: "안녕하세요" })
  @IsString()
  @MaxLength(200)
  korean!: string;

  @ApiPropertyOptional({ example: "annyeonghaseyo" })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  koreanRomanized?: string;

  @ApiPropertyOptional({ example: "Hello, how are you?" })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  exampleSentenceEn?: string;

  @ApiPropertyOptional({ example: "안녕하세요, 잘 지내세요?" })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  exampleSentenceKo?: string;

  @ApiPropertyOptional({ enum: VocabLevel, example: VocabLevel.BEGINNER })
  @IsOptional()
  @IsEnum(VocabLevel)
  level?: VocabLevel;
}

export class UpdateVocabWordDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  english?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  korean?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  koreanRomanized?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  exampleSentenceEn?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  exampleSentenceKo?: string;

  @ApiPropertyOptional({ enum: VocabLevel })
  @IsOptional()
  @IsEnum(VocabLevel)
  level?: VocabLevel;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class QueryVocabWordDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ enum: VocabLevel })
  @IsOptional()
  @IsEnum(VocabLevel)
  level?: VocabLevel;

  @ApiPropertyOptional({ description: "Cari di kolom english/korean" })
  @IsOptional()
  @IsString()
  search?: string;
}
