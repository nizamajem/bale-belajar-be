import { ApiProperty } from "@nestjs/swagger";
import { IsString, MaxLength, MinLength } from "class-validator";

export class ChangePasswordDto {
  @ApiProperty({ example: "SandiLama123!" })
  @IsString()
  currentPassword!: string;

  @ApiProperty({ example: "SandiBaru456!" })
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  newPassword!: string;
}
