import { Body, Controller, Delete, Get, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { ResponseMessage } from "../../common/decorators/response-message.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { AuthenticatedUser } from "../../common/types/authenticated-user.type";
import { LinkSchoolDto } from "./dto/link-school.dto";
import { SearchSchoolsQueryDto } from "./dto/search-schools-query.dto";
import { UpdateStudentProfileDto } from "./dto/update-student-profile.dto";
import { StudentAccountService } from "./student-account.service";

@ApiTags("Student Account")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.STUDENT)
@Controller("student/account")
export class StudentAccountController {
  constructor(private readonly studentAccountService: StudentAccountService) {}

  @Get("schools")
  @ResponseMessage("Daftar sekolah berhasil diambil.")
  searchSchools(@Query() query: SearchSchoolsQueryDto) {
    return this.studentAccountService.searchSchools(query.search);
  }

  @Post("school-link")
  @ResponseMessage("Berhasil terhubung ke sekolah.")
  linkSchool(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: LinkSchoolDto,
  ) {
    return this.studentAccountService.linkSchool(currentUser, dto);
  }

  @Delete("school-link")
  @ResponseMessage("Berhasil memutuskan koneksi sekolah.")
  unlinkSchool(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.studentAccountService.unlinkSchool(currentUser);
  }

  @Patch("profile")
  @ResponseMessage("Profil berhasil diperbarui.")
  updateProfile(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: UpdateStudentProfileDto,
  ) {
    return this.studentAccountService.updateProfile(currentUser, dto);
  }
}
