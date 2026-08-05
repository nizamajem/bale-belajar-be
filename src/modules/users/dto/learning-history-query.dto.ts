import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsOptional } from "class-validator";
import { PaginationQueryDto } from "../../../common/dto/pagination-query.dto";

export class LearningHistoryQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ["ALL", "ONBOARDING", "PLACEMENT", "QUEST"] })
  @IsOptional()
  @IsIn(["ALL", "ONBOARDING", "PLACEMENT", "QUEST"])
  type?: "ALL" | "ONBOARDING" | "PLACEMENT" | "QUEST";

  @ApiPropertyOptional({ enum: ["ALL", "CORRECT", "WRONG", "SKIPPED", "REVIEW"] })
  @IsOptional()
  @IsIn(["ALL", "CORRECT", "WRONG", "SKIPPED", "REVIEW"])
  result?: "ALL" | "CORRECT" | "WRONG" | "SKIPPED" | "REVIEW";
}
