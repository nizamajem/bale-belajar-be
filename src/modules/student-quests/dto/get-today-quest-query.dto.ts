import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

export class GetTodayQuestQueryDto {
  @ApiProperty({ example: "scientia" })
  @IsString()
  @IsNotEmpty()
  worldKey!: string;
}
