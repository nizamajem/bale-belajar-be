import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsObject, IsOptional } from "class-validator";

// Bentuk payload beda-beda per QuestQuestionType (selectedOptionId, matches,
// order, dst - lihat QuestAnswerPayload di quest-evaluation.util.ts).
// Validasi bentuk spesifik dilakukan di service, bukan di DTO ini - bikin
// discriminated-union DTO untuk 14 tipe sekaligus tidak sepadan manfaatnya.
export class SaveQuestAnswerDto {
  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  payload?: Record<string, unknown>;
}
