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
import { ClassroomsService } from "./classrooms.service";
import { AddClassroomStudentDto } from "./dto/add-classroom-student.dto";
import { CreateClassroomDto } from "./dto/create-classroom.dto";
import { UpdateClassroomDto } from "./dto/update-classroom.dto";

@ApiTags("Classrooms")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TEACHER)
@Controller("classrooms")
export class ClassroomsController {
  constructor(private readonly classroomsService: ClassroomsService) {}

  @Get()
  @ResponseMessage("Data kelas berhasil diambil.")
  findAll(@Query() query: PaginationQueryDto) {
    return this.classroomsService.findAll(query);
  }

  @Get(":id")
  @ResponseMessage("Detail kelas berhasil diambil.")
  findOne(@Param("id") id: string) {
    return this.classroomsService.findOne(id);
  }

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ResponseMessage("Kelas berhasil dibuat.")
  create(@Body() dto: CreateClassroomDto) {
    return this.classroomsService.create(dto);
  }

  @Patch(":id")
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ResponseMessage("Kelas berhasil diperbarui.")
  update(@Param("id") id: string, @Body() dto: UpdateClassroomDto) {
    return this.classroomsService.update(id, dto);
  }

  @Delete(":id")
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ResponseMessage("Kelas berhasil dinonaktifkan.")
  remove(@Param("id") id: string) {
    return this.classroomsService.remove(id);
  }

  @Post(":id/students")
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ResponseMessage("Siswa berhasil ditambahkan ke kelas.")
  addStudent(@Param("id") id: string, @Body() dto: AddClassroomStudentDto) {
    return this.classroomsService.addStudent(id, dto);
  }

  @Delete(":id/students/:studentId")
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ResponseMessage("Siswa berhasil dikeluarkan dari kelas.")
  removeStudent(@Param("id") id: string, @Param("studentId") studentId: string) {
    return this.classroomsService.removeStudent(id, studentId);
  }

  @Get(":id/statistics")
  @ResponseMessage("Statistik kelas berhasil diambil.")
  getStatistics(@Param("id") id: string) {
    return this.classroomsService.getStatistics(id);
  }
}

