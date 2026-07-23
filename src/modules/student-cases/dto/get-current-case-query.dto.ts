import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

export class GetCurrentCaseQueryDto {
  @ApiProperty({ example: "detectivia" })
  @IsString()
  @IsNotEmpty()
  worldKey!: string;
}
