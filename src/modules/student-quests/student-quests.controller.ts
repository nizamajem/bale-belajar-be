import { Body, Controller, Get, Param, Post, Put, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { ResponseMessage } from "../../common/decorators/response-message.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { AuthenticatedUser } from "../../common/types/authenticated-user.type";
import { GetTodayQuestQueryDto } from "./dto/get-today-quest-query.dto";
import { SaveQuestAnswerDto } from "./dto/save-quest-answer.dto";
import { StudentQuestsService } from "./student-quests.service";

@ApiTags("Student Quests")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.STUDENT)
@Controller("student")
export class StudentQuestsController {
  constructor(private readonly studentQuestsService: StudentQuestsService) {}

  @Get("quests/today")
  @ResponseMessage("Quest hari ini berhasil diambil.")
  getTodayQuest(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query() query: GetTodayQuestQueryDto,
  ) {
    return this.studentQuestsService.getTodayQuest(currentUser, query.worldKey);
  }

  @Post("quests/:assignmentId/start")
  @ResponseMessage("Quest berhasil dimulai.")
  startAttempt(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param("assignmentId") assignmentId: string,
  ) {
    return this.studentQuestsService.startAttempt(currentUser, assignmentId);
  }

  @Put("quest-attempts/:attemptId/answers/:questionId")
  @ResponseMessage("Jawaban berhasil disimpan.")
  saveAnswer(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param("attemptId") attemptId: string,
    @Param("questionId") questionId: string,
    @Body() dto: SaveQuestAnswerDto,
  ) {
    return this.studentQuestsService.saveAnswer(currentUser, attemptId, questionId, dto);
  }

  @Post("quest-attempts/:attemptId/submit")
  @ResponseMessage("Quest berhasil disubmit.")
  submitAttempt(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param("attemptId") attemptId: string,
  ) {
    return this.studentQuestsService.submitAttempt(currentUser, attemptId);
  }

  @Get("quest-attempts/:attemptId/result")
  @ResponseMessage("Hasil quest berhasil diambil.")
  getResult(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param("attemptId") attemptId: string,
  ) {
    return this.studentQuestsService.getResult(currentUser, attemptId);
  }
}
