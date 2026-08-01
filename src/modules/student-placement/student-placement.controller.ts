import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { ResponseMessage } from "../../common/decorators/response-message.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { AuthenticatedUser } from "../../common/types/authenticated-user.type";
import { SavePlacementAnswerDto } from "./dto/save-placement-answer.dto";
import { StartPlacementDto } from "./dto/start-placement.dto";
import { StudentPlacementService } from "./student-placement.service";

@ApiTags("Student Placement")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.STUDENT)
@Controller("student/placement")
export class StudentPlacementController {
  constructor(private readonly service: StudentPlacementService) {}

  @Post("start")
  @ResponseMessage("Cek awal berhasil dimulai.")
  start(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: StartPlacementDto,
  ) {
    return this.service.start(currentUser, dto);
  }

  @Get("latest")
  @ResponseMessage("Attempt cek awal terakhir berhasil diambil.")
  getLatest(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.service.getLatest(currentUser);
  }

  @Put(":attemptId/answers/:questionId")
  @ResponseMessage("Jawaban cek awal berhasil disimpan.")
  saveAnswer(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param("attemptId") attemptId: string,
    @Param("questionId") questionId: string,
    @Body() dto: SavePlacementAnswerDto,
  ) {
    return this.service.saveAnswer(currentUser, attemptId, questionId, dto);
  }

  @Post(":attemptId/skip/:questionId")
  @ResponseMessage("Soal cek awal berhasil dilewati.")
  skipAnswer(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param("attemptId") attemptId: string,
    @Param("questionId") questionId: string,
    @Query("questionType") questionType?: string,
  ) {
    return this.service.skipAnswer(
      currentUser,
      attemptId,
      questionId,
      questionType,
    );
  }

  @Post(":attemptId/submit")
  @ResponseMessage("Cek awal berhasil dikirim.")
  submit(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param("attemptId") attemptId: string,
  ) {
    return this.service.submit(currentUser, attemptId);
  }

  @Post(":attemptId/analyze")
  @ResponseMessage("Analisis cek awal berhasil dibuat.")
  analyze(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param("attemptId") attemptId: string,
  ) {
    return this.service.analyze(currentUser, attemptId);
  }

  @Get(":attemptId/analysis")
  @ResponseMessage("Hasil analisis cek awal berhasil diambil.")
  getAnalysis(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param("attemptId") attemptId: string,
  ) {
    return this.service.getAnalysis(currentUser, attemptId);
  }

  @Get("latest-result")
  @ResponseMessage("Hasil analisis terbaru berhasil diambil.")
  getLatestResult(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.service.getLatestResult(currentUser);
  }
}
