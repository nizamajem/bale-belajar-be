import { Body, Controller, Get, Patch, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { ResponseMessage } from "../../common/decorators/response-message.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { AuthenticatedUser } from "../../common/types/authenticated-user.type";
import { UpdateVocabSettingDto } from "./dto/update-vocab-setting.dto";
import { VocabService } from "./vocab.service";

@ApiTags("Student Vocab")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.STUDENT)
@Controller("student/vocab")
export class StudentVocabController {
  constructor(private readonly vocabService: VocabService) {}

  @Get("daily")
  @ResponseMessage("Kosakata hari ini berhasil diambil.")
  getDaily(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.vocabService.getDailyWords(currentUser);
  }

  @Get("settings")
  @ResponseMessage("Pengaturan kosakata berhasil diambil.")
  getSettings(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.vocabService.getSetting(currentUser);
  }

  @Patch("settings")
  @ResponseMessage("Pengaturan kosakata berhasil diperbarui.")
  updateSettings(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: UpdateVocabSettingDto,
  ) {
    return this.vocabService.updateSetting(currentUser, dto);
  }

  @Get("categories")
  @ResponseMessage("Daftar kategori kosakata berhasil diambil.")
  getCategories() {
    return this.vocabService.listActiveCategories();
  }
}
