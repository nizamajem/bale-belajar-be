import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

export class GoogleLoginDto {
  @ApiProperty({ description: "Google ID token dari Google Identity Services." })
  @IsString()
  @IsNotEmpty()
  idToken!: string;
}
