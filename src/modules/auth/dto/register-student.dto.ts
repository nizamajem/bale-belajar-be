import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";

export class RegisterStudentDto {
  @ApiProperty({ example: "Dimas Aditya" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  name!: string;

  @ApiProperty({ example: "dimas@example.com" })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: "SandiKuat123!" })
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password!: string;

  @ApiPropertyOptional({ example: 10, description: "Kelas 10-12 (SMA/SMK)" })
  @IsOptional()
  @IsInt()
  @Min(10)
  @Max(12)
  gradeLevel?: number;
}
