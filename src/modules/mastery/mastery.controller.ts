import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { ResponseMessage } from "../../common/decorators/response-message.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { AuthenticatedUser } from "../../common/types/authenticated-user.type";
import { GetGrowthMapQueryDto } from "./dto/get-growth-map-query.dto";
import { MasteryService } from "./mastery.service";

@ApiTags("Student Mastery")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.STUDENT)
@Controller("student/mastery")
export class MasteryController {
  constructor(private readonly masteryService: MasteryService) {}

  @Get()
  @ResponseMessage("Peta Tumbuh berhasil diambil.")
  getGrowthMap(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query() query: GetGrowthMapQueryDto,
  ) {
    return this.masteryService.getGrowthMapForStudent(
      currentUser,
      query.worldKey,
    );
  }
}
