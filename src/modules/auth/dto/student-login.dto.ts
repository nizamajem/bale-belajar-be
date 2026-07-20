import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, MaxLength } from "class-validator";

export class StudentLoginDto {
  @ApiProperty({ example: "BB-S001" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  participantCode!: string;
}

