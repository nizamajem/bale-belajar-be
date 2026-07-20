import { Body, Controller, Get, Param, Post, Put, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { ResponseMessage } from "../../common/decorators/response-message.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { AuthenticatedUser } from "../../common/types/authenticated-user.type";
import { MarkQuestionDto } from "./dto/mark-question.dto";
import { SaveAnswerDto } from "./dto/save-answer.dto";
import { StudentAssessmentsService } from "./student-assessments.service";

@ApiTags("Student Assessment")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.STUDENT)
@Controller("student")
export class StudentAssessmentsController {
  constructor(
    private readonly studentAssessmentsService: StudentAssessmentsService,
  ) {}

  @Get("assessments")
  @ResponseMessage("Data asesmen siswa berhasil diambil.")
  findAssignments(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.studentAssessmentsService.findAssignments(currentUser);
  }

  @Get("assessments/:id")
  @ResponseMessage("Detail asesmen siswa berhasil diambil.")
  findAssessment(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param("id") assessmentId: string,
  ) {
    return this.studentAssessmentsService.findAssessment(
      currentUser,
      assessmentId,
    );
  }

  @Post("assessments/:id/start")
  @ResponseMessage("Attempt asesmen berhasil dimulai.")
  startAttempt(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param("id") assessmentId: string,
  ) {
    return this.studentAssessmentsService.startAttempt(
      currentUser,
      assessmentId,
    );
  }

  @Get("attempts/:attemptId")
  @ResponseMessage("Attempt siswa berhasil diambil.")
  getAttempt(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param("attemptId") attemptId: string,
  ) {
    return this.studentAssessmentsService.getAttempt(currentUser, attemptId);
  }

  @Put("attempts/:attemptId/answers/:questionId")
  @ResponseMessage("Jawaban berhasil disimpan.")
  saveAnswer(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param("attemptId") attemptId: string,
    @Param("questionId") questionId: string,
    @Body() dto: SaveAnswerDto,
  ) {
    return this.studentAssessmentsService.saveAnswer(
      currentUser,
      attemptId,
      questionId,
      dto,
    );
  }

  @Post("attempts/:attemptId/mark/:questionId")
  @ResponseMessage("Status tanda soal berhasil disimpan.")
  markQuestion(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param("attemptId") attemptId: string,
    @Param("questionId") questionId: string,
    @Body() dto: MarkQuestionDto,
  ) {
    return this.studentAssessmentsService.markQuestion(
      currentUser,
      attemptId,
      questionId,
      dto,
    );
  }

  @Post("attempts/:attemptId/submit")
  @ResponseMessage("Attempt berhasil disubmit.")
  submitAttempt(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param("attemptId") attemptId: string,
  ) {
    return this.studentAssessmentsService.submitAttempt(currentUser, attemptId);
  }

  @Get("attempts/:attemptId/result")
  @ResponseMessage("Hasil attempt berhasil diambil.")
  getResult(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param("attemptId") attemptId: string,
  ) {
    return this.studentAssessmentsService.getResult(currentUser, attemptId);
  }

  @Get("attempts/:attemptId/report")
  @ResponseMessage("Laporan attempt berhasil diambil.")
  getReport(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param("attemptId") attemptId: string,
  ) {
    return this.studentAssessmentsService.getReport(currentUser, attemptId);
  }
}
