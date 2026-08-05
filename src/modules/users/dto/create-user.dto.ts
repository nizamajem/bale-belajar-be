import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { UserRole, UserStatus } from "@prisma/client";
import {
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";

export class CreateUserDto {
  @ApiProperty({ enum: [UserRole.STUDENT, UserRole.TEACHER], example: UserRole.STUDENT })
  @IsEnum(UserRole)
  role!: UserRole;

  @ApiProperty({ example: "Aulia Rahman" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  name!: string;

  @ApiPropertyOptional({ example: "aulia@example.com" })
  @IsOptional()
  @IsEmail()
  @MaxLength(160)
  email?: string;

  @ApiPropertyOptional({ example: "6281234567890" })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @ApiPropertyOptional({ example: "SandiKuat123!" })
  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(100)
  password?: string;

  @ApiPropertyOptional({ enum: UserStatus, example: UserStatus.ACTIVE })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @ApiPropertyOptional({ example: "BB-S001" })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  participantCode?: string;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  gradeLevel?: number;

  @ApiPropertyOptional({ example: "2026/2027" })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  academicYear?: string;

  @ApiPropertyOptional({ example: "7b4a5ef8-01bf-4a30-8f57-862ca8d96b27" })
  @IsOptional()
  @IsUUID()
  schoolId?: string;

  @ApiPropertyOptional({ example: "Matematika" })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  subjectSpecialization?: string;
}
