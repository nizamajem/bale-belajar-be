import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsOptional, IsUUID } from "class-validator";

export class SaveAnswerDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  selectedOptionId?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isMarkedForReview?: boolean;
}

