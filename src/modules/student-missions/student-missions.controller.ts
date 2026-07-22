import { Body, Controller, Get, Param, Post, Put, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { ResponseMessage } from "../../common/decorators/response-message.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { AuthenticatedUser } from "../../common/types/authenticated-user.type";
import { GetTodayMissionQueryDto } from "./dto/get-today-mission-query.dto";
import { SaveMissionAnswerDto } from "./dto/save-mission-answer.dto";
import { StudentMissionsService } from "./student-missions.service";

@ApiTags("Student Missions")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.STUDENT)
@Controller("student")
export class StudentMissionsController {
  constructor(private readonly studentMissionsService: StudentMissionsService) {}

  @Get("missions/today")
  @ResponseMessage("Misi Hari Ini berhasil diambil.")
  getTodayMission(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query() query: GetTodayMissionQueryDto,
  ) {
    return this.studentMissionsService.getTodayMission(
      currentUser,
      query.worldKey,
    );
  }

  @Post("missions/:assignmentId/start")
  @ResponseMessage("Misi berhasil dimulai.")
  startAttempt(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param("assignmentId") assignmentId: string,
  ) {
    return this.studentMissionsService.startAttempt(currentUser, assignmentId);
  }

  @Put("mission-attempts/:attemptId/answers/:activityId")
  @ResponseMessage("Jawaban aktivitas berhasil disimpan.")
  saveAnswer(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param("attemptId") attemptId: string,
    @Param("activityId") activityId: string,
    @Body() dto: SaveMissionAnswerDto,
  ) {
    return this.studentMissionsService.saveAnswer(
      currentUser,
      attemptId,
      activityId,
      dto,
    );
  }

  @Post("mission-attempts/:attemptId/submit")
  @ResponseMessage("Misi berhasil disubmit.")
  submitAttempt(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param("attemptId") attemptId: string,
  ) {
    return this.studentMissionsService.submitAttempt(currentUser, attemptId);
  }

  @Get("mission-attempts/:attemptId/result")
  @ResponseMessage("Hasil misi berhasil diambil.")
  getResult(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param("attemptId") attemptId: string,
  ) {
    return this.studentMissionsService.getResult(currentUser, attemptId);
  }
}
