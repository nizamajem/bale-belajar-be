import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsString, IsUUID } from "class-validator";

export class GetTodayQuestQueryDto {
  @ApiProperty({ example: "scientia" })
  @IsString()
  @IsNotEmpty()
  worldKey!: string;

  @ApiProperty({ required: false, example: "2b8463d6-2b72-4e39-8ec2-607e8f2b21e2" })
  @IsOptional()
  @IsUUID()
  competencyId?: string;
}
