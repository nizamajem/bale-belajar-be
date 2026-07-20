import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from "class-validator";
import { SubCompetencyInputDto } from "./sub-competency-input.dto";

export class CreateCompetencyDto {
  @ApiProperty({ example: "7b4a5ef8-01bf-4a30-8f57-862ca8d96b27" })
  @IsUUID()
  subjectId!: string;

  @ApiProperty({ example: "MTK-6-PER" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  code!: string;

  @ApiProperty({ example: "Perbandingan" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(180)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ example: 6 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  gradeLevel?: number;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  orderNumber!: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ type: [SubCompetencyInputDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SubCompetencyInputDto)
  subCompetencies?: SubCompetencyInputDto[];
}

