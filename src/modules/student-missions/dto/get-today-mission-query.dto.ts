import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

export class GetTodayMissionQueryDto {
  @ApiProperty({ example: "numeria" })
  @IsString()
  @IsNotEmpty()
  worldKey!: string;
}
