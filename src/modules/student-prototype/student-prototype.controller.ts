import { Body, Controller, Param, Post, Put, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { ResponseMessage } from "../../common/decorators/response-message.decorator";
import { SaveOnboardingDto } from "../student-onboarding/dto/save-onboarding.dto";
import { SavePlacementAnswerDto } from "../student-placement/dto/save-placement-answer.dto";
import { StudentPrototypeService } from "./student-prototype.service";

@ApiTags("Student Prototype Session")
@Controller("prototype/student")
export class StudentPrototypeController {
  constructor(private readonly service: StudentPrototypeService) {}

  @Post("session")
  @ResponseMessage("Sesi prototype berhasil dibuat.")
  startSession() {
    return this.service.startSession();
  }

  @Put(":studentProfileId/onboarding")
  @ResponseMessage("Onboarding prototype berhasil disimpan.")
  saveOnboarding(
    @Param("studentProfileId") studentProfileId: string,
    @Body() dto: SaveOnboardingDto,
  ) {
    return this.service.saveOnboarding(studentProfileId, dto);
  }

  @Post(":studentProfileId/onboarding/complete")
  @ResponseMessage("Onboarding prototype berhasil selesai.")
  completeOnboarding(
    @Param("studentProfileId") studentProfileId: string,
    @Body() dto: SaveOnboardingDto,
  ) {
    return this.service.completeOnboarding(studentProfileId, dto);
  }

  @Post(":studentProfileId/placement/start")
  @ResponseMessage("Placement prototype berhasil dimulai.")
  startPlacement(
    @Param("studentProfileId") studentProfileId: string,
    @Query("worldKey") worldKey?: string,
  ) {
    return this.service.startPlacement(studentProfileId, worldKey);
  }

  @Put("placement/:attemptId/answers/:questionId")
  @ResponseMessage("Jawaban placement prototype berhasil disimpan.")
  savePlacementAnswer(
    @Param("attemptId") attemptId: string,
    @Param("questionId") questionId: string,
    @Body() dto: SavePlacementAnswerDto,
  ) {
    return this.service.savePlacementAnswer(attemptId, questionId, dto);
  }

  @Post("placement/:attemptId/skip/:questionId")
  @ResponseMessage("Soal placement prototype berhasil dilewati.")
  skipPlacementAnswer(
    @Param("attemptId") attemptId: string,
    @Param("questionId") questionId: string,
    @Query("questionType") questionType?: string,
  ) {
    return this.service.skipPlacementAnswer(attemptId, questionId, questionType);
  }

  @Post("placement/:attemptId/submit")
  @ResponseMessage("Placement prototype berhasil dikirim.")
  submitPlacement(@Param("attemptId") attemptId: string) {
    return this.service.submitPlacement(attemptId);
  }
}
