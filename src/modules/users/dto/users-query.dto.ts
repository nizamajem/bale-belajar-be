import { ApiPropertyOptional } from "@nestjs/swagger";
import { UserStatus } from "@prisma/client";
import { IsEnum, IsIn, IsOptional, IsString } from "class-validator";
import { PaginationQueryDto } from "../../../common/dto/pagination-query.dto";

export class UsersQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ["STUDENT", "TEACHER", "PARENT"] })
  @IsOptional()
  @IsIn(["STUDENT", "TEACHER", "PARENT"])
  role?: "STUDENT" | "TEACHER" | "PARENT";

  @ApiPropertyOptional({ example: "aulia@example.com" })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({ example: "62812" })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ enum: UserStatus })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;
}
