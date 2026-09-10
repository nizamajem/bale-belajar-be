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
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { CreateVocabCategoryDto, UpdateVocabCategoryDto } from "./dto/vocab-category.dto";
import {
  CreateVocabWordDto,
  QueryVocabWordDto,
  UpdateVocabWordDto,
} from "./dto/vocab-word.dto";
import { VocabService } from "./vocab.service";

@ApiTags("Admin Vocab")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
@Controller("admin/vocab")
export class AdminVocabController {
  constructor(private readonly vocabService: VocabService) {}

  @Get("categories")
  @ResponseMessage("Daftar kategori kosakata berhasil diambil.")
  listCategories() {
    return this.vocabService.listCategoriesForAdmin();
  }

  @Post("categories")
  @ResponseMessage("Kategori kosakata berhasil dibuat.")
  createCategory(@Body() dto: CreateVocabCategoryDto) {
    return this.vocabService.createCategory(dto);
  }

  @Patch("categories/:id")
  @ResponseMessage("Kategori kosakata berhasil diperbarui.")
  updateCategory(@Param("id") id: string, @Body() dto: UpdateVocabCategoryDto) {
    return this.vocabService.updateCategory(id, dto);
  }

  @Delete("categories/:id")
  @ResponseMessage("Kategori kosakata berhasil dinonaktifkan.")
  deleteCategory(@Param("id") id: string) {
    return this.vocabService.deleteCategory(id);
  }

  @Get("words")
  @ResponseMessage("Daftar kosakata berhasil diambil.")
  listWords(@Query() query: QueryVocabWordDto) {
    return this.vocabService.listWordsForAdmin(query);
  }

  @Post("words")
  @ResponseMessage("Kosakata berhasil dibuat.")
  createWord(@Body() dto: CreateVocabWordDto) {
    return this.vocabService.createWord(dto);
  }

  @Patch("words/:id")
  @ResponseMessage("Kosakata berhasil diperbarui.")
  updateWord(@Param("id") id: string, @Body() dto: UpdateVocabWordDto) {
    return this.vocabService.updateWord(id, dto);
  }

  @Delete("words/:id")
  @ResponseMessage("Kosakata berhasil dinonaktifkan.")
  deleteWord(@Param("id") id: string) {
    return this.vocabService.deleteWord(id);
  }
}
