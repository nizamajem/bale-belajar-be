import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { QuestionDifficulty, QuestionStatus, QuestionType } from "@prisma/client";
import { Type } from "class-transformer";
import {
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from "class-validator";
import { QuestionOptionInputDto } from "./question-option-input.dto";

export class CreateQuestionDto {
  @ApiProperty({ example: "MTK-PER-001" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  code!: string;

  @ApiProperty()
  @IsUUID()
  subjectId!: string;

  @ApiProperty()
  @IsUUID()
  competencyId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  subCompetencyId?: string;

  @ApiProperty({ example: 6 })
  @IsInt()
  @Min(1)
  @Max(12)
  gradeLevel!: number;

  @ApiProperty({ enum: QuestionDifficulty, example: QuestionDifficulty.MEDIUM })
  @IsEnum(QuestionDifficulty)
  difficulty!: QuestionDifficulty;

  @ApiProperty({ enum: QuestionType, example: QuestionType.MULTIPLE_CHOICE })
  @IsEnum(QuestionType)
  type!: QuestionType;

  @ApiProperty({ example: "Rina membeli 10 buku dan mendapat 25 stiker..." })
  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  questionText!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  explanation?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  imageUrl?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.1)
  @Max(100)
  weight?: number;

  @ApiPropertyOptional({ example: "Demo seed" })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  source?: string;

  @ApiPropertyOptional({ enum: QuestionStatus, example: QuestionStatus.DRAFT })
  @IsOptional()
  @IsEnum(QuestionStatus)
  status?: QuestionStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  createdBy?: string;

  @ApiProperty({ type: [QuestionOptionInputDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuestionOptionInputDto)
  options!: QuestionOptionInputDto[];
}

