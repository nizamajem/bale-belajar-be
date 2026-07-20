import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsInt, IsNumber, IsOptional, IsUUID, Max, Min } from "class-validator";

export class AddAssessmentQuestionDto {
  @ApiProperty()
  @IsUUID()
  questionId!: string;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  orderNumber!: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.1)
  @Max(100)
  weightOverride?: number;
}

