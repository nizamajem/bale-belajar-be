import { ApiProperty } from "@nestjs/swagger";
import { IsUUID } from "class-validator";

export class AddAssessmentClassroomDto {
  @ApiProperty()
  @IsUUID()
  classroomId!: string;
}

