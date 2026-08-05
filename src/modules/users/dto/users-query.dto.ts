import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsOptional } from "class-validator";
import { PaginationQueryDto } from "../../../common/dto/pagination-query.dto";

export class UsersQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ["STUDENT", "TEACHER", "PARENT"] })
  @IsOptional()
  @IsIn(["STUDENT", "TEACHER", "PARENT"])
  role?: "STUDENT" | "TEACHER" | "PARENT";
}
