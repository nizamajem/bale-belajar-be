import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsNumber, IsString, Max, MaxLength, Min, ValidateNested } from 'class-validator';

class WritingCriterionScoreDto {
  @IsString() criterionId!: string;
  @IsNumber() @Min(0) @Max(100) score!: number;
}
export class ReviewKoreanWritingDto {
  @IsArray() @ArrayMinSize(1) @ValidateNested({ each: true }) @Type(() => WritingCriterionScoreDto)
  criteria!: WritingCriterionScoreDto[];
  @IsString() @MaxLength(5000) feedback!: string;
}
