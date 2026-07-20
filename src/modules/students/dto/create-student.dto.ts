import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsBoolean,
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from "class-validator";

export class CreateStudentDto {
  @ApiProperty({ example: "7b4a5ef8-01bf-4a30-8f57-862ca8d96b27" })
  @IsUUID()
  schoolId!: string;

  @ApiProperty({ example: "BB-S001" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  participantCode!: string;

  @ApiPropertyOptional({ example: "S-001" })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  studentNumber?: string;

  @ApiProperty({ example: "Aulia Rahman" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  fullName!: string;

  @ApiPropertyOptional({ example: "6281234567890" })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @ApiPropertyOptional({ example: "F" })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  gender?: string;

  @ApiPropertyOptional({ example: "2014-05-01" })
  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @ApiProperty({ example: "2026/2027" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  academicYear!: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

