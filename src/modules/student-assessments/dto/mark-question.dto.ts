import { ApiProperty } from "@nestjs/swagger";
import { IsBoolean } from "class-validator";

export class MarkQuestionDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  isMarkedForReview!: boolean;
}

