import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { ResponseMessage } from "../../common/decorators/response-message.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { PaginationQueryDto } from "../../common/dto/pagination-query.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { AssessmentsService } from "./assessments.service";
import { AddAssessmentClassroomDto } from "./dto/add-assessment-classroom.dto";
import { AddAssessmentQuestionDto } from "./dto/add-assessment-question.dto";
import { CreateAssessmentDto } from "./dto/create-assessment.dto";
import { UpdateAssessmentDto } from "./dto/update-assessment.dto";

@ApiTags("Assessments")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TEACHER)
@Controller("assessments")
export class AssessmentsController {
  constructor(private readonly assessmentsService: AssessmentsService) {}

  @Get()
  @ResponseMessage("Data asesmen berhasil diambil.")
  findAll(@Query() query: PaginationQueryDto) {
    return this.assessmentsService.findAll(query);
  }

  @Get(":id")
  @ResponseMessage("Detail asesmen berhasil diambil.")
  findOne(@Param("id") id: string) {
    return this.assessmentsService.findOne(id);
  }

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ResponseMessage("Asesmen berhasil dibuat.")
  create(@Body() dto: CreateAssessmentDto) {
    return this.assessmentsService.create(dto);
  }

  @Patch(":id")
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ResponseMessage("Asesmen berhasil diperbarui.")
  update(@Param("id") id: string, @Body() dto: UpdateAssessmentDto) {
    return this.assessmentsService.update(id, dto);
  }

  @Delete(":id")
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ResponseMessage("Asesmen berhasil diarsipkan.")
  remove(@Param("id") id: string) {
    return this.assessmentsService.remove(id);
  }

  @Post(":id/questions")
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ResponseMessage("Soal berhasil ditambahkan ke asesmen.")
  addQuestion(@Param("id") id: string, @Body() dto: AddAssessmentQuestionDto) {
    return this.assessmentsService.addQuestion(id, dto);
  }

  @Delete(":id/questions/:questionId")
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ResponseMessage("Soal berhasil dihapus dari asesmen.")
  removeQuestion(@Param("id") id: string, @Param("questionId") questionId: string) {
    return this.assessmentsService.removeQuestion(id, questionId);
  }

  @Post(":id/classrooms")
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ResponseMessage("Kelas berhasil ditambahkan ke asesmen.")
  addClassroom(@Param("id") id: string, @Body() dto: AddAssessmentClassroomDto) {
    return this.assessmentsService.addClassroom(id, dto);
  }

  @Post(":id/publish")
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ResponseMessage("Asesmen berhasil dipublikasikan.")
  publish(@Param("id") id: string) {
    return this.assessmentsService.publish(id);
  }

  @Post(":id/close")
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ResponseMessage("Asesmen berhasil ditutup.")
  close(@Param("id") id: string) {
    return this.assessmentsService.close(id);
  }

  @Get(":id/progress")
  @ResponseMessage("Progress asesmen berhasil diambil.")
  getProgress(@Param("id") id: string) {
    return this.assessmentsService.getProgress(id);
  }

  @Get(":id/results")
  @ResponseMessage("Hasil asesmen berhasil diambil.")
  getResults(@Param("id") id: string) {
    return this.assessmentsService.getResults(id);
  }

  @Get(":id/heatmap")
  @ResponseMessage("Heatmap asesmen berhasil diambil.")
  getHeatmap(@Param("id") id: string) {
    return this.assessmentsService.getHeatmap(id);
  }

  @Get(":id/remedial-groups")
  @ResponseMessage("Kelompok remedial berhasil diambil.")
  getRemedialGroups(@Param("id") id: string) {
    return this.assessmentsService.getRemedialGroups(id);
  }

  @Get(":id/export")
  @ResponseMessage("Export asesmen berhasil diproses.")
  exportResults(@Param("id") id: string) {
    return this.assessmentsService.exportResults(id);
  }
}

