import { ApiProperty } from "@nestjs/swagger";
import { IsUUID } from "class-validator";

export class AddPrerequisiteDto {
  @ApiProperty({ example: "7b4a5ef8-01bf-4a30-8f57-862ca8d96b27" })
  @IsUUID()
  prerequisiteCompetencyId!: string;
}

