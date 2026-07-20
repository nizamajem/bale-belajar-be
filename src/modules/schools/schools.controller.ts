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
import { CreateSchoolDto } from "./dto/create-school.dto";
import { UpdateSchoolDto } from "./dto/update-school.dto";
import { SchoolsService } from "./schools.service";

@ApiTags("Schools")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
@Controller("schools")
export class SchoolsController {
  constructor(private readonly schoolsService: SchoolsService) {}

  @Get()
  @ResponseMessage("Data sekolah berhasil diambil.")
  findAll(@Query() query: PaginationQueryDto) {
    return this.schoolsService.findAll(query);
  }

  @Get(":id")
  @ResponseMessage("Detail sekolah berhasil diambil.")
  findOne(@Param("id") id: string) {
    return this.schoolsService.findOne(id);
  }

  @Post()
  @ResponseMessage("Sekolah berhasil dibuat.")
  create(@Body() dto: CreateSchoolDto) {
    return this.schoolsService.create(dto);
  }

  @Patch(":id")
  @ResponseMessage("Sekolah berhasil diperbarui.")
  update(@Param("id") id: string, @Body() dto: UpdateSchoolDto) {
    return this.schoolsService.update(id, dto);
  }

  @Delete(":id")
  @ResponseMessage("Sekolah berhasil dihapus.")
  remove(@Param("id") id: string) {
    return this.schoolsService.remove(id);
  }

  @Get(":id/statistics")
  @ResponseMessage("Statistik sekolah berhasil diambil.")
  getStatistics(@Param("id") id: string) {
    return this.schoolsService.getStatistics(id);
  }
}

