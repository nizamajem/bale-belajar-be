import { Body, Controller, Get, Put, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { ResponseMessage } from "../../common/decorators/response-message.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { AuthenticatedUser } from "../../common/types/authenticated-user.type";
import { SaveOnboardingDto } from "./dto/save-onboarding.dto";
import { StudentOnboardingService } from "./student-onboarding.service";

@ApiTags("Student Onboarding")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.STUDENT)
@Controller("student/onboarding")
export class StudentOnboardingController {
  constructor(private readonly service: StudentOnboardingService) {}

  @Get()
  @ResponseMessage("Status onboarding berhasil diambil.")
  getStatus(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.service.getStatus(currentUser);
  }

  @Put("answers")
  @ResponseMessage("Jawaban onboarding berhasil disimpan.")
  saveAnswers(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: SaveOnboardingDto,
  ) {
    return this.service.saveAnswers(currentUser, dto);
  }

  @Post("complete")
  @ResponseMessage("Onboarding berhasil diselesaikan.")
  complete(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: SaveOnboardingDto,
  ) {
    return this.service.complete(currentUser, dto);
  }
}
