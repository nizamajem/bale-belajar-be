import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { PilotStatus } from "@prisma/client";
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

export class CreateSchoolDto {
  @ApiProperty({ example: "SDN 1 Mataram" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  name!: string;

  @ApiProperty({ example: "sdn-1-mataram" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  slug!: string;

  @ApiPropertyOptional({ example: "50200001" })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  npsn?: string;

  @ApiProperty({ example: "Jl. Pendidikan No. 1" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(240)
  address!: string;

  @ApiProperty({ example: "Nusa Tenggara Barat" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  province!: string;

  @ApiProperty({ example: "Mataram" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  city!: string;

  @ApiPropertyOptional({ example: "Selaparang" })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  district?: string;

  @ApiPropertyOptional({ example: "Ibu Sari" })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  contactName?: string;

  @ApiPropertyOptional({ example: "6281234567890" })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  contactPhone?: string;

  @ApiPropertyOptional({ example: "sdn1@example.sch.id" })
  @IsOptional()
  @IsEmail()
  @MaxLength(120)
  contactEmail?: string;

  @ApiPropertyOptional({ enum: PilotStatus, example: PilotStatus.PROSPECT })
  @IsOptional()
  @IsEnum(PilotStatus)
  pilotStatus?: PilotStatus;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

