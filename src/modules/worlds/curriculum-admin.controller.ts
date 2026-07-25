import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { ResponseMessage } from "../../common/decorators/response-message.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { WorldsService } from "./worlds.service";

type CurriculumModulePayload = {
  bigIdea?: string;
  estimatedMinutes?: number;
  orderNumber?: number;
  simpleGoal?: string;
  slug?: string;
  title?: string;
};

@ApiTags("Admin Curriculum")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
@Controller("admin/curriculum")
export class CurriculumAdminController {
  constructor(private readonly worldsService: WorldsService) {}

  @Get("worlds/:worldKey")
  @ResponseMessage("Kurikulum dunia berhasil diambil.")
  findByWorld(@Param("worldKey") worldKey: string) {
    return this.worldsService.findCurriculumByWorldKey(worldKey);
  }

  @Post("worlds/:worldKey/modules")
  @ResponseMessage("Modul kurikulum berhasil dibuat.")
  createModule(@Param("worldKey") worldKey: string, @Body() body: CurriculumModulePayload) {
    return this.worldsService.createCurriculumModule(worldKey, body);
  }

  @Patch("modules/:moduleId")
  @ResponseMessage("Modul kurikulum berhasil diperbarui.")
  updateModule(@Param("moduleId") moduleId: string, @Body() body: CurriculumModulePayload) {
    return this.worldsService.updateCurriculumModule(moduleId, body);
  }
}
