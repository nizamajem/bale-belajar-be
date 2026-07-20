import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { ResponseMessage } from "../../common/decorators/response-message.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { PaginationQueryDto } from "../../common/dto/pagination-query.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { CreateSubjectDto } from "./dto/create-subject.dto";
import { UpdateSubjectDto } from "./dto/update-subject.dto";
import { SubjectsService } from "./subjects.service";

@ApiTags("Subjects")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TEACHER)
@Controller("subjects")
export class SubjectsController {
  constructor(private readonly subjectsService: SubjectsService) {}

  @Get()
  @ResponseMessage("Data mata pelajaran berhasil diambil.")
  findAll(@Query() query: PaginationQueryDto) {
    return this.subjectsService.findAll(query);
  }

  @Get(":id")
  @ResponseMessage("Detail mata pelajaran berhasil diambil.")
  findOne(@Param("id") id: string) {
    return this.subjectsService.findOne(id);
  }

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ResponseMessage("Mata pelajaran berhasil dibuat.")
  create(@Body() dto: CreateSubjectDto) {
    return this.subjectsService.create(dto);
  }

  @Patch(":id")
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ResponseMessage("Mata pelajaran berhasil diperbarui.")
  update(@Param("id") id: string, @Body() dto: UpdateSubjectDto) {
    return this.subjectsService.update(id, dto);
  }

  @Delete(":id")
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ResponseMessage("Mata pelajaran berhasil dinonaktifkan.")
  remove(@Param("id") id: string) {
    return this.subjectsService.remove(id);
  }
}

