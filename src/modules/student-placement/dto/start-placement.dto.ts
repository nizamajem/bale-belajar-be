import { IsOptional, IsString } from "class-validator";

export class StartPlacementDto {
  @IsOptional()
  @IsString()
  worldKey?: string;
}
