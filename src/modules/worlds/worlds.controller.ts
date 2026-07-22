import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { ResponseMessage } from "../../common/decorators/response-message.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { AuthenticatedUser } from "../../common/types/authenticated-user.type";
import { WorldsService } from "./worlds.service";

@ApiTags("Student Worlds")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.STUDENT)
@Controller("student/worlds")
export class WorldsController {
  constructor(private readonly worldsService: WorldsService) {}

  @Get()
  @ResponseMessage("Daftar dunia berhasil diambil.")
  findAll(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.worldsService.findAllForStudent(currentUser);
  }
}
