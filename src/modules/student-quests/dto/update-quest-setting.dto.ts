import { ApiProperty } from "@nestjs/swagger";
import { IsInt, Max, Min } from "class-validator";

export class UpdateQuestSettingDto {
  @ApiProperty({ example: 2, description: "Jumlah misi per hari per dunia (1-5)" })
  @IsInt()
  @Min(1)
  @Max(5)
  dailyQuestCount!: number;
}
