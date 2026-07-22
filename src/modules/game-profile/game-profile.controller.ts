import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { ResponseMessage } from "../../common/decorators/response-message.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { AuthenticatedUser } from "../../common/types/authenticated-user.type";
import { GameProfileService } from "./game-profile.service";

@ApiTags("Student Game Profile")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.STUDENT)
@Controller("student/game-profile")
export class GameProfileController {
  constructor(private readonly gameProfileService: GameProfileService) {}

  @Get()
  @ResponseMessage("Profil BaleHero berhasil diambil.")
  getMyProfile(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.gameProfileService.getMyProfile(currentUser);
  }
}
