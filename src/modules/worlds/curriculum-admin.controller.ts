import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { ResponseMessage } from "../../common/decorators/response-message.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { CurriculumImportService } from "./curriculum-import.service";
import { WorldsService } from "./worlds.service";

type CurriculumModulePayload = {
  bigIdea?: string;
  estimatedMinutes?: number;
  orderNumber?: number;
  simpleGoal?: string;
  slug?: string;
  title?: string;
};

type CurriculumLessonPayload = {
  body?: string;
  examples?: string[];
  items?: string[];
  orderNumber?: number;
  title?: string;
  type?: string;
};

type CurriculumCaseStudyPayload = {
  analysisSteps?: string[];
  commonMistake?: string;
  orderNumber?: number;
  story?: string;
  title?: string;
};

type RemedialRulePayload = {
  actionType?: string;
  minScoreExclusive?: number;
  recommendationMessage?: string;
  recommendationTitle?: string;
};

type QuestQuestionPayload = {
  code?: string;
  competencyId?: string;
  difficulty?: string;
  instruction?: string;
  measurementCategory?: string;
  orderNumber?: number;
  questionText?: string;
  questionType?: string;
  status?: string;
  stimulusText?: string;
};

type ChapterPayload = {
  chapterCode?: string;
  chapterNumber?: number;
  difficulty?: string;
  estimatedDurationDays?: number;
  goal?: string;
  recommendedSessions?: number;
  status?: string;
  story?: string;
  subWorldKey?: string;
  subWorldName?: string;
  title?: string;
};

type QuestPayload = {
  code?: string;
  estimatedMinutes?: number;
  missionType?: string;
  objective?: string;
  status?: string;
  story?: string;
  studentInstruction?: string;
  title?: string;
  xpRewardFirst?: number;
};

@ApiTags("Admin Curriculum")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
@Controller("admin/curriculum")
export class CurriculumAdminController {
  constructor(
    private readonly worldsService: WorldsService,
    private readonly curriculumImportService: CurriculumImportService,
  ) {}

  @Get("readiness")
  @ResponseMessage("Kesiapan kurikulum berhasil dicek.")
  readiness() {
    return this.worldsService.curriculumReadiness();
  }

  @Get("import-template")
  @ResponseMessage("Template import kurikulum berhasil diambil.")
  importTemplate() {
    return this.curriculumImportService.template();
  }

  @Post("import-json")
  @ResponseMessage("Import kurikulum berhasil diproses.")
  importJson(@Body() body: { curriculum?: Record<string, unknown>; normalize?: boolean }) {
    return this.curriculumImportService.importJson(body);
  }

  @Get("worlds/:worldKey")
  @ResponseMessage("Kurikulum dunia berhasil diambil.")
  findByWorld(@Param("worldKey") worldKey: string) {
    return this.worldsService.findAdminCurriculumByWorldKey(worldKey);
  }

  @Get("worlds/:worldKey/questions")
  @ResponseMessage("Pertanyaan dunia berhasil diambil.")
  findQuestionsByWorld(@Param("worldKey") worldKey: string) {
    return this.worldsService.findQuestQuestionsByWorldKey(worldKey);
  }

  @Get("worlds/:worldKey/imported")
  @ResponseMessage("Kurikulum hasil import berhasil diambil.")
  findImportedByWorld(@Param("worldKey") worldKey: string) {
    return this.worldsService.findImportedCurriculumByWorldKey(worldKey);
  }

  @Post("worlds/:worldKey/chapters")
  @ResponseMessage("Kurikulum berhasil dibuat.")
  createChapter(@Param("worldKey") worldKey: string, @Body() body: ChapterPayload) {
    return this.worldsService.createChapter(worldKey, body);
  }

  @Patch("chapters/:chapterId")
  @ResponseMessage("Kurikulum berhasil diperbarui.")
  updateChapter(@Param("chapterId") chapterId: string, @Body() body: ChapterPayload) {
    return this.worldsService.updateChapter(chapterId, body);
  }

  @Delete("chapters/:chapterId")
  @ResponseMessage("Kurikulum berhasil diarsipkan.")
  deleteChapter(@Param("chapterId") chapterId: string) {
    return this.worldsService.deleteChapter(chapterId);
  }

  @Post("chapters/:chapterId/quests")
  @ResponseMessage("Misi berhasil dibuat.")
  createQuest(@Param("chapterId") chapterId: string, @Body() body: QuestPayload) {
    return this.worldsService.createQuest(chapterId, body);
  }

  @Patch("quests/:questId")
  @ResponseMessage("Misi berhasil diperbarui.")
  updateQuest(@Param("questId") questId: string, @Body() body: QuestPayload) {
    return this.worldsService.updateQuest(questId, body);
  }

  @Delete("quests/:questId")
  @ResponseMessage("Misi berhasil diarsipkan.")
  deleteQuest(@Param("questId") questId: string) {
    return this.worldsService.deleteQuest(questId);
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

  @Delete("modules/:moduleId")
  @ResponseMessage("Modul kurikulum berhasil diarsipkan.")
  deleteModule(@Param("moduleId") moduleId: string) {
    return this.worldsService.deleteCurriculumModule(moduleId);
  }

  @Post("modules/:moduleId/lessons")
  @ResponseMessage("Materi kurikulum berhasil dibuat.")
  createLesson(@Param("moduleId") moduleId: string, @Body() body: CurriculumLessonPayload) {
    return this.worldsService.createCurriculumLesson(moduleId, body);
  }

  @Patch("lessons/:lessonId")
  @ResponseMessage("Materi kurikulum berhasil diperbarui.")
  updateLesson(@Param("lessonId") lessonId: string, @Body() body: CurriculumLessonPayload) {
    return this.worldsService.updateCurriculumLesson(lessonId, body);
  }

  @Delete("lessons/:lessonId")
  @ResponseMessage("Materi kurikulum berhasil dihapus.")
  deleteLesson(@Param("lessonId") lessonId: string) {
    return this.worldsService.deleteCurriculumLesson(lessonId);
  }

  @Post("modules/:moduleId/case-studies")
  @ResponseMessage("Studi kasus berhasil dibuat.")
  createCaseStudy(@Param("moduleId") moduleId: string, @Body() body: CurriculumCaseStudyPayload) {
    return this.worldsService.createCurriculumCaseStudy(moduleId, body);
  }

  @Patch("case-studies/:caseStudyId")
  @ResponseMessage("Studi kasus berhasil diperbarui.")
  updateCaseStudy(@Param("caseStudyId") caseStudyId: string, @Body() body: CurriculumCaseStudyPayload) {
    return this.worldsService.updateCurriculumCaseStudy(caseStudyId, body);
  }

  @Delete("case-studies/:caseStudyId")
  @ResponseMessage("Studi kasus berhasil dihapus.")
  deleteCaseStudy(@Param("caseStudyId") caseStudyId: string) {
    return this.worldsService.deleteCurriculumCaseStudy(caseStudyId);
  }

  @Post("modules/:moduleId/remedial-rules")
  @ResponseMessage("Aturan remedial berhasil dibuat.")
  createRemedialRule(@Param("moduleId") moduleId: string, @Body() body: RemedialRulePayload) {
    return this.worldsService.createRemedialRule(moduleId, body);
  }

  @Patch("remedial-rules/:ruleId")
  @ResponseMessage("Aturan remedial berhasil diperbarui.")
  updateRemedialRule(@Param("ruleId") ruleId: string, @Body() body: RemedialRulePayload) {
    return this.worldsService.updateRemedialRule(ruleId, body);
  }

  @Delete("remedial-rules/:ruleId")
  @ResponseMessage("Aturan remedial berhasil dihapus.")
  deleteRemedialRule(@Param("ruleId") ruleId: string) {
    return this.worldsService.deleteRemedialRule(ruleId);
  }

  @Post("quests/:questId/questions")
  @ResponseMessage("Pertanyaan quest berhasil dibuat.")
  createQuestQuestion(@Param("questId") questId: string, @Body() body: QuestQuestionPayload) {
    return this.worldsService.createQuestQuestion(questId, body);
  }

  @Patch("questions/:questionId")
  @ResponseMessage("Pertanyaan quest berhasil diperbarui.")
  updateQuestQuestion(@Param("questionId") questionId: string, @Body() body: QuestQuestionPayload) {
    return this.worldsService.updateQuestQuestion(questionId, body);
  }

  @Delete("questions/:questionId")
  @ResponseMessage("Pertanyaan quest berhasil dihapus.")
  deleteQuestQuestion(@Param("questionId") questionId: string) {
    return this.worldsService.deleteQuestQuestion(questionId);
  }
}
