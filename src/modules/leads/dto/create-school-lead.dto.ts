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
} from "class-validator";
import { Type } from "class-transformer";

export class CreateSchoolLeadDto {
  @ApiProperty({ example: "SDN 1 Mataram" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  schoolName!: string;

  @ApiProperty({ example: "Ibu Sari" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  contactName!: string;

  @ApiPropertyOptional({ example: "Kepala Sekolah" })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  position?: string;

  @ApiProperty({ example: "6281234567890" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  phone!: string;

  @ApiPropertyOptional({ example: "sekolah@example.sch.id" })
  @IsOptional()
  @IsEmail()
  @MaxLength(120)
  email?: string;

  @ApiPropertyOptional({ example: 240 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100000)
  studentCount?: number;

  @ApiPropertyOptional({ example: "Ingin mencoba pilot untuk kelas VI." })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  message?: string;

  @ApiPropertyOptional({ example: "profile" })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  source?: string;

  @ApiPropertyOptional({
    description: "Honeypot anti-spam. Harus kosong.",
    example: "",
  })
  @IsOptional()
  @IsString()
  website?: string;
}

