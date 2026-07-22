import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsUUID } from "class-validator";

export class SaveMissionAnswerDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  selectedOptionId?: string;
}
