import { IsBoolean, IsObject, IsOptional, IsString } from "class-validator";

export class SavePlacementAnswerDto {
  @IsString()
  questionType!: string;

  @IsOptional()
  @IsObject()
  answer?: Record<string, unknown>;

  @IsOptional()
  @IsBoolean()
  isSkipped?: boolean;

  @IsOptional()
  @IsString()
  clientAnsweredAt?: string;
}
