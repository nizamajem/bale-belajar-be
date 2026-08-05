import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { ResponseMessage } from "../../common/decorators/response-message.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { AuthenticatedUser } from "../../common/types/authenticated-user.type";
import { StudentBaleVerseService } from "./student-baleverse.service";

@ApiTags("Student BaleVerse")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.STUDENT)
@Controller("student/baleverse")
export class StudentBaleVerseController {
  constructor(private readonly service: StudentBaleVerseService) {}

  @Get()
  @ResponseMessage("Data BaleVerse berhasil diambil.")
  getSummary(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.service.getSummary(currentUser);
  }
}
