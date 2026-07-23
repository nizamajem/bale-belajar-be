import { Body, Controller, Get, Param, Post, Put, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { ResponseMessage } from "../../common/decorators/response-message.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { AuthenticatedUser } from "../../common/types/authenticated-user.type";
import { GetCurrentCaseQueryDto } from "./dto/get-current-case-query.dto";
import { SaveCaseAnswerDto } from "./dto/save-case-answer.dto";
import { SubmitCaseAttemptDto } from "./dto/submit-case-attempt.dto";
import { StudentCasesService } from "./student-cases.service";

@ApiTags("Student Cases")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.STUDENT)
@Controller("student")
export class StudentCasesController {
  constructor(private readonly studentCasesService: StudentCasesService) {}

  @Get("cases/current")
  @ResponseMessage("Kasus saat ini berhasil diambil.")
  getCurrentCase(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query() query: GetCurrentCaseQueryDto,
  ) {
    return this.studentCasesService.getCurrentCase(currentUser, query.worldKey);
  }

  @Post("cases/:assignmentId/start")
  @ResponseMessage("Kasus berhasil dimulai.")
  startAttempt(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param("assignmentId") assignmentId: string,
  ) {
    return this.studentCasesService.startAttempt(currentUser, assignmentId);
  }

  @Put("case-attempts/:attemptId/answers/:questionId")
  @ResponseMessage("Jawaban berhasil disimpan.")
  saveAnswer(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param("attemptId") attemptId: string,
    @Param("questionId") questionId: string,
    @Body() dto: SaveCaseAnswerDto,
  ) {
    return this.studentCasesService.saveAnswer(currentUser, attemptId, questionId, dto);
  }

  @Post("case-attempts/:attemptId/submit")
  @ResponseMessage("Kasus berhasil disubmit.")
  submitAttempt(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param("attemptId") attemptId: string,
    @Body() dto: SubmitCaseAttemptDto,
  ) {
    return this.studentCasesService.submitAttempt(currentUser, attemptId, dto);
  }

  @Get("case-attempts/:attemptId/result")
  @ResponseMessage("Hasil kasus berhasil diambil.")
  getResult(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param("attemptId") attemptId: string,
  ) {
    return this.studentCasesService.getResult(currentUser, attemptId);
  }
}
