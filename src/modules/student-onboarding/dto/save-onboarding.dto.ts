import { IsArray, IsObject, IsOptional, IsString } from "class-validator";

export class SaveOnboardingDto {
  @IsOptional()
  @IsString()
  learningGoal?: string;

  @IsOptional()
  @IsString()
  learningWorld?: string;

  @IsOptional()
  @IsString()
  gradeChoice?: string;

  @IsOptional()
  @IsString()
  selfReportedLevel?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  learningFormats?: string[];

  @IsOptional()
  @IsString()
  dailyDuration?: string;

  @IsOptional()
  @IsString()
  studyTime?: string;

  @IsOptional()
  @IsString()
  reminderPreference?: string;

  @IsOptional()
  @IsObject()
  rawAnswers?: Record<string, unknown>;
}
