import { ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from "class-validator";

export class UpdateStudentProfileDto {
  @ApiPropertyOptional({ example: "Dimas Aditya" })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  fullName?: string;

  @ApiPropertyOptional({ example: 10, description: "Kelas 10-12 (SMA/SMK)" })
  @IsOptional()
  @IsInt()
  @Min(10)
  @Max(12)
  gradeLevel?: number;
}
