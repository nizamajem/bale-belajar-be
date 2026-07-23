import { ApiProperty } from "@nestjs/swagger";
import { ConfidenceDeclaration } from "@prisma/client";
import { IsEnum, IsNotEmpty, IsString, MaxLength } from "class-validator";

export class SubmitCaseAttemptDto {
  @ApiProperty({ example: "Belum cukup bukti untuk menentukan siapa yang memindahkan file." })
  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  conclusionText!: string;

  @ApiProperty({ enum: ConfidenceDeclaration, example: ConfidenceDeclaration.MEDIUM })
  @IsEnum(ConfidenceDeclaration)
  confidenceLevel!: ConfidenceDeclaration;
}
