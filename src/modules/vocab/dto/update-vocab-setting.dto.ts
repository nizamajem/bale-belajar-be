import { ApiPropertyOptional } from "@nestjs/swagger";
import { VocabDisplayLanguage, VocabLevel } from "@prisma/client";
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from "class-validator";

export class UpdateVocabSettingDto {
  @ApiPropertyOptional({ example: 5, description: "Jumlah kosakata baru per hari (1-20)" })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  dailyCount?: number;

  @ApiPropertyOptional({ enum: VocabDisplayLanguage, example: VocabDisplayLanguage.BOTH })
  @IsOptional()
  @IsEnum(VocabDisplayLanguage)
  displayLanguage?: VocabDisplayLanguage;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  notificationEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  widgetEnabled?: boolean;

  @ApiPropertyOptional({ example: 8, description: "Jam mulai notifikasi (0-23)" })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(23)
  notificationStartHour?: number;

  @ApiPropertyOptional({ example: 20, description: "Jam akhir notifikasi (0-23)" })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(23)
  notificationEndHour?: number;

  @ApiPropertyOptional({
    enum: VocabLevel,
    isArray: true,
    example: [VocabLevel.BEGINNER, VocabLevel.INTERMEDIATE],
    description: "Kosongkan array untuk semua level",
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsEnum(VocabLevel, { each: true })
  levels?: VocabLevel[];

  @ApiPropertyOptional({
    type: [String],
    example: ["greetings", "food"],
    description: "Key kategori (lihat GET /student/vocab/categories). Kosongkan array untuk semua kategori",
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  categoryKeys?: string[];
}
