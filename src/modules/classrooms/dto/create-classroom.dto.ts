import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from "class-validator";

export class CreateClassroomDto {
  @ApiProperty({ example: "7b4a5ef8-01bf-4a30-8f57-862ca8d96b27" })
  @IsUUID()
  schoolId!: string;

  @ApiProperty({ example: "VI A" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  name!: string;

  @ApiProperty({ example: 6 })
  @IsInt()
  @Min(1)
  @Max(12)
  gradeLevel!: number;

  @ApiProperty({ example: "2026/2027" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  academicYear!: string;

  @ApiPropertyOptional({ example: "7b4a5ef8-01bf-4a30-8f57-862ca8d96b27" })
  @IsOptional()
  @IsUUID()
  homeroomTeacherId?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

