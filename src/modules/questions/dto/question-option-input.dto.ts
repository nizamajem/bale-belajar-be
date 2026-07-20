import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min } from "class-validator";

export class QuestionOptionInputDto {
  @ApiProperty({ example: "A" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(5)
  optionKey!: string;

  @ApiProperty({ example: "2 : 5" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  optionText!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  imageUrl?: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  isCorrect!: boolean;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  orderNumber!: number;
}

