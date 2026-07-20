import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { ResponseMessage } from "../../common/decorators/response-message.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { PaginationQueryDto } from "../../common/dto/pagination-query.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { CreateStudentDto } from "./dto/create-student.dto";
import { UpdateStudentDto } from "./dto/update-student.dto";
import { StudentsService } from "./students.service";

@ApiTags("Students")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TEACHER)
@Controller("students")
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Get()
  @ResponseMessage("Data siswa berhasil diambil.")
  findAll(@Query() query: PaginationQueryDto) {
    return this.studentsService.findAll(query);
  }

  @Get(":id")
  @ResponseMessage("Detail siswa berhasil diambil.")
  findOne(@Param("id") id: string) {
    return this.studentsService.findOne(id);
  }

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ResponseMessage("Siswa berhasil dibuat.")
  create(@Body() dto: CreateStudentDto) {
    return this.studentsService.create(dto);
  }

  @Patch(":id")
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ResponseMessage("Siswa berhasil diperbarui.")
  update(@Param("id") id: string, @Body() dto: UpdateStudentDto) {
    return this.studentsService.update(id, dto);
  }

  @Delete(":id")
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ResponseMessage("Siswa berhasil dihapus.")
  remove(@Param("id") id: string) {
    return this.studentsService.remove(id);
  }

  @Get(":id/assessment-history")
  @ResponseMessage("Riwayat asesmen siswa berhasil diambil.")
  getAssessmentHistory(@Param("id") id: string) {
    return this.studentsService.getAssessmentHistory(id);
  }
}

