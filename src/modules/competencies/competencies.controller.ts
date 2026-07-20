import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { ResponseMessage } from "../../common/decorators/response-message.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { PaginationQueryDto } from "../../common/dto/pagination-query.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { AddPrerequisiteDto } from "./dto/add-prerequisite.dto";
import { CreateCompetencyDto } from "./dto/create-competency.dto";
import { UpdateCompetencyDto } from "./dto/update-competency.dto";
import { CompetenciesService } from "./competencies.service";

@ApiTags("Competencies")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TEACHER)
@Controller("competencies")
export class CompetenciesController {
  constructor(private readonly competenciesService: CompetenciesService) {}

  @Get()
  @ResponseMessage("Data kompetensi berhasil diambil.")
  findAll(@Query() query: PaginationQueryDto) {
    return this.competenciesService.findAll(query);
  }

  @Get(":id")
  @ResponseMessage("Detail kompetensi berhasil diambil.")
  findOne(@Param("id") id: string) {
    return this.competenciesService.findOne(id);
  }

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ResponseMessage("Kompetensi berhasil dibuat.")
  create(@Body() dto: CreateCompetencyDto) {
    return this.competenciesService.create(dto);
  }

  @Patch(":id")
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ResponseMessage("Kompetensi berhasil diperbarui.")
  update(@Param("id") id: string, @Body() dto: UpdateCompetencyDto) {
    return this.competenciesService.update(id, dto);
  }

  @Delete(":id")
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ResponseMessage("Kompetensi berhasil dinonaktifkan.")
  remove(@Param("id") id: string) {
    return this.competenciesService.remove(id);
  }

  @Post(":id/prerequisites")
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ResponseMessage("Prerequisite kompetensi berhasil ditambahkan.")
  addPrerequisite(@Param("id") id: string, @Body() dto: AddPrerequisiteDto) {
    return this.competenciesService.addPrerequisite(id, dto);
  }
}

