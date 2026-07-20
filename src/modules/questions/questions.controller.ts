import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { ResponseMessage } from "../../common/decorators/response-message.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { PaginationQueryDto } from "../../common/dto/pagination-query.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { CreateQuestionDto } from "./dto/create-question.dto";
import { UpdateQuestionDto } from "./dto/update-question.dto";
import { QuestionsService } from "./questions.service";

@ApiTags("Questions")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TEACHER)
@Controller("questions")
export class QuestionsController {
  constructor(private readonly questionsService: QuestionsService) {}

  @Get()
  @ResponseMessage("Data soal berhasil diambil.")
  findAll(@Query() query: PaginationQueryDto) {
    return this.questionsService.findAll(query);
  }

  @Get(":id")
  @ResponseMessage("Detail soal berhasil diambil.")
  findOne(@Param("id") id: string) {
    return this.questionsService.findOne(id);
  }

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TEACHER)
  @ResponseMessage("Soal berhasil dibuat.")
  create(@Body() dto: CreateQuestionDto) {
    return this.questionsService.create(dto);
  }

  @Patch(":id")
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TEACHER)
  @ResponseMessage("Soal berhasil diperbarui.")
  update(@Param("id") id: string, @Body() dto: UpdateQuestionDto) {
    return this.questionsService.update(id, dto);
  }

  @Delete(":id")
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ResponseMessage("Soal berhasil diarsipkan.")
  remove(@Param("id") id: string) {
    return this.questionsService.remove(id);
  }

  @Post(":id/activate")
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ResponseMessage("Soal berhasil diaktifkan.")
  activate(@Param("id") id: string) {
    return this.questionsService.activate(id);
  }
}

