import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty, IsString } from "class-validator";

export class LoginDto {
  @ApiProperty({ example: "guru@balebelajar.id" })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: "Guru123!" })
  @IsString()
  @IsNotEmpty()
  password!: string;
}

