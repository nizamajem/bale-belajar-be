import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { CurriculumLessonType } from "@prisma/client";
import { AuthenticatedUser } from "../../common/types/authenticated-user.type";
import { PrismaService } from "../../database/prisma/prisma.service";

type CurriculumModuleInput = {
  bigIdea?: string;
  estimatedMinutes?: number;
  orderNumber?: number;
  simpleGoal?: string;
  slug?: string;
  title?: string;
};

type CurriculumLessonInput = {
  body?: string;
  examples?: string[];
  items?: string[];
  orderNumber?: number;
  title?: string;
  type?: string;
};

type CurriculumCaseStudyInput = {
  analysisSteps?: string[];
  commonMistake?: string;
  orderNumber?: number;
  story?: string;
  title?: string;
};

type RemedialRuleInput = {
  actionType?: string;
  minScoreExclusive?: number;
  recommendationMessage?: string;
  recommendationTitle?: string;
};

const MIN_ACTIVE_QUESTS_PER_WORLD = 5;
const MIN_ACTIVE_QUESTIONS = 20;
const REQUIRED_PLACEMENT_TYPES = [
  "SINGLE_CHOICE",
  "MULTIPLE_SELECT",
  "BINARY_CHOICE",
  "SHORT_TEXT",
  "MATCHING",
  "ORDERING",
  "IMAGE_CHOICE",
  "AUDIO_CHOICE",
  "LONG_TEXT",
  "CODE_INPUT",
  "IMAGE_HOTSPOT",
  "VOICE_RESPONSE",
  "TIMELINE_BUILDER",
  "EVIDENCE_BOARD",
] as const;

@Injectable()
export class WorldsService {
  constructor(private readonly prisma: PrismaService) {}

  async curriculumReadiness() {
    const [
      worlds,
      questCount,
      questionCount,
      placementTemplates,
      mediaCount,
      hotspotCount,
      evidenceCount,
      sourceRows,
    ] = await Promise.all([
      this.prisma.world.findMany({
        where: { isActive: true },
        include: {
          subject: { select: { name: true } },
          _count: {
            select: {
              chapters: true,
              quests: { where: { status: "ACTIVE" } },
            },
          },
        },
        orderBy: { orderNumber: "asc" },
      }),
      this.prisma.quest.count({ where: { status: "ACTIVE" } }),
      this.prisma.questQuestion.count({ where: { status: "ACTIVE" } }),
      this.prisma.placementQuestionTemplate.findMany({
        where: { isActive: true },
        orderBy: { orderNumber: "asc" },
        select: { orderNumber: true, questionType: true, prompt: true },
      }),
      this.prisma.questMedia.count(),
      this.prisma.questHotspotArea.count(),
      this.prisma.questEvidenceItem.count(),
      this.prisma.curriculumSourceRecord.count(),
    ]);

    const worldsWithoutEnoughQuests = worlds
      .filter((world) => world._count.quests < MIN_ACTIVE_QUESTS_PER_WORLD)
      .map((world) => ({ key: world.key, quests: world._count.quests }));
    const worldsWithoutChapters = worlds
      .filter((world) => world._count.chapters === 0)
      .map((world) => world.key);
    const placementTypes = new Set(
      placementTemplates.map((template) => template.questionType),
    );
    const missingPlacementTypes = REQUIRED_PLACEMENT_TYPES.filter(
      (type) => !placementTypes.has(type),
    );
    const duplicatePlacementTypes = [...placementTypes]
      .map((type) => ({
        type,
        count: placementTemplates.filter(
          (template) => template.questionType === type,
        ).length,
      }))
      .filter((item) => item.count > 1);

    const blockers = [
      ...(worlds.length === 0 ? ["Belum ada world aktif."] : []),
      ...(questCount === 0 ? ["Belum ada quest aktif."] : []),
      ...(questionCount < MIN_ACTIVE_QUESTIONS
        ? [
            `Pertanyaan aktif baru ${questionCount}; minimal produksi ${MIN_ACTIVE_QUESTIONS}.`,
          ]
        : []),
      ...worldsWithoutEnoughQuests.map(
        (world) =>
          `World ${world.key} baru punya ${world.quests} quest aktif; minimal ${MIN_ACTIVE_QUESTS_PER_WORLD}.`,
      ),
      ...worldsWithoutChapters.map(
        (key) => `World ${key} belum punya chapter.`,
      ),
      ...(placementTemplates.length === 0
        ? ["Template placement belum tersedia."]
        : []),
      ...missingPlacementTypes.map(
        (type) => `Template placement ${type} belum tersedia.`,
      ),
      ...duplicatePlacementTypes.map(
        (item) =>
          `Template placement ${item.type} duplikat ${item.count} kali.`,
      ),
    ];

    return {
      ready: blockers.length === 0,
      policy: {
        minActiveQuestsPerWorld: MIN_ACTIVE_QUESTS_PER_WORLD,
        minActiveQuestions: MIN_ACTIVE_QUESTIONS,
        requiredPlacementTypes: REQUIRED_PLACEMENT_TYPES,
      },
      counts: {
        sourceRows,
        worlds: worlds.length,
        activeQuests: questCount,
        activeQuestQuestions: questionCount,
        placementTemplates: placementTemplates.length,
        media: mediaCount,
        hotspots: hotspotCount,
        evidenceItems: evidenceCount,
      },
      worlds: worlds.map((world) => ({
        key: world.key,
        name: world.name,
        subject: world.subject.name,
        chapters: world._count.chapters,
        activeQuests: world._count.quests,
        ready:
          world._count.chapters > 0 &&
          world._count.quests >= MIN_ACTIVE_QUESTS_PER_WORLD,
      })),
      placementTemplates,
      missingPlacementTypes,
      blockers,
    };
  }

  async findAllForStudent(currentUser: AuthenticatedUser) {
    const studentProfileId = this.getStudentProfileId(currentUser);

    const worlds = await this.prisma.world.findMany({
      where: {
        isActive: true,
        quests: { some: { status: "ACTIVE" } },
        chapters: { some: {} },
      },
      include: {
        subject: { select: { id: true, code: true, name: true } },
        worldProgress: {
          where: { studentProfileId },
          select: { worldLevel: true, worldXp: true },
        },
      },
      orderBy: { orderNumber: "asc" },
    });

    return worlds.map((world) => ({
      id: world.id,
      key: world.key,
      name: world.name,
      characterClass: world.characterClass,
      themeDescription: world.themeDescription,
      subject: world.subject,
      worldLevel: world.worldProgress[0]?.worldLevel ?? 1,
      worldXp: world.worldProgress[0]?.worldXp ?? 0,
    }));
  }

  async findByKeyOrThrow(worldKey: string) {
    const world = await this.prisma.world.findUnique({
      where: { key: worldKey },
    });

    if (!world || !world.isActive) {
      return null;
    }

    return world;
  }

  async findCurriculumByWorldKey(worldKey: string) {
    const world = await this.prisma.world.findUnique({
      where: { key: worldKey },
      include: {
        subject: { select: { id: true, code: true, name: true } },
        curriculumModules: {
          where: { status: "ACTIVE" },
          orderBy: { orderNumber: "asc" },
          include: {
            competency: { select: { id: true, code: true, name: true } },
            lessons: { orderBy: { orderNumber: "asc" } },
            caseStudies: { orderBy: { orderNumber: "asc" } },
            remedialRules: {
              include: {
                competency: { select: { id: true, code: true, name: true } },
              },
            },
          },
        },
      },
    });

    if (!world || !world.isActive) {
      throw new NotFoundException("Dunia tidak ditemukan.");
    }

    return {
      id: world.id,
      key: world.key,
      name: world.name,
      characterClass: world.characterClass,
      themeDescription: world.themeDescription,
      subject: world.subject,
      modules: world.curriculumModules.map((module) => ({
        id: module.id,
        slug: module.slug,
        title: module.title,
        simpleGoal: module.simpleGoal,
        bigIdea: module.bigIdea,
        orderNumber: module.orderNumber,
        estimatedMinutes: module.estimatedMinutes,
        competency: module.competency,
        lessons: module.lessons.map((lesson) => ({
          id: lesson.id,
          type: lesson.type,
          title: lesson.title,
          body: lesson.body,
          examples: lesson.examples,
          items: lesson.items,
          orderNumber: lesson.orderNumber,
        })),
        caseStudies: module.caseStudies.map((caseStudy) => ({
          id: caseStudy.id,
          title: caseStudy.title,
          story: caseStudy.story,
          analysisSteps: caseStudy.analysisSteps,
          commonMistake: caseStudy.commonMistake,
          orderNumber: caseStudy.orderNumber,
        })),
        remedialRules: module.remedialRules.map((rule) => ({
          id: rule.id,
          minScoreExclusive: rule.minScoreExclusive,
          recommendationTitle: rule.recommendationTitle,
          recommendationMessage: rule.recommendationMessage,
          actionType: rule.actionType,
          competency: rule.competency,
        })),
      })),
    };
  }

  async findAdaptivePlan(currentUser: AuthenticatedUser, worldKey: string) {
    const studentProfileId = this.getStudentProfileId(currentUser);
    const curriculum = await this.findCurriculumByWorldKey(worldKey);
    const competencyIds = curriculum.modules
      .map((module) => module.competency?.id)
      .filter((id): id is string => Boolean(id));
    const masteryStates = await this.prisma.masteryState.findMany({
      where: { studentProfileId, competencyId: { in: competencyIds } },
      include: { competency: { select: { id: true, code: true, name: true } } },
    });
    const masteryByCompetency = new Map(
      masteryStates.map((state) => [state.competencyId, state]),
    );
    const firstModule = curriculum.modules[0] ?? null;
    const weakModule = curriculum.modules.find((module) => {
      if (!module.competency) return false;
      const mastery = masteryByCompetency.get(module.competency.id);
      if (!mastery) return true;
      return (
        Number(mastery.masteryScore) < 60 || mastery.status === "NEEDS_PRACTICE"
      );
    });
    const targetModule = weakModule ?? firstModule;
    const targetMastery = targetModule?.competency
      ? masteryByCompetency.get(targetModule.competency.id)
      : null;
    const needsRemedial = Boolean(
      targetMastery &&
      (Number(targetMastery.masteryScore) < 60 ||
        targetMastery.status === "NEEDS_PRACTICE"),
    );

    return {
      world: {
        key: curriculum.key,
        name: curriculum.name,
        characterClass: curriculum.characterClass,
      },
      nextAction: needsRemedial
        ? "REMEDIAL"
        : targetMastery
          ? "NEXT_MODULE"
          : "START_MODULE",
      title: needsRemedial
        ? "Ulangi bagian yang belum kuat"
        : targetMastery
          ? "Lanjut ke tantangan berikutnya"
          : "Mulai dari materi pertama",
      message: needsRemedial
        ? "Sistem akan memberi materi singkat dan kasus baru dengan pola mirip."
        : "Belajar materi, lihat studi kasus, lalu kerjakan tes.",
      targetModule,
      mastery: targetMastery
        ? {
            competency: targetMastery.competency,
            masteryScore: Number(targetMastery.masteryScore),
            status: targetMastery.status,
            confidence: targetMastery.confidence,
            evidenceCount: targetMastery.evidenceCount,
          }
        : null,
    };
  }

  async createCurriculumModule(worldKey: string, input: CurriculumModuleInput) {
    const world = await this.prisma.world.findUnique({
      where: { key: worldKey },
    });
    if (!world || !world.isActive) {
      throw new NotFoundException("Dunia tidak ditemukan.");
    }

    const orderNumber =
      input.orderNumber ??
      (await this.prisma.curriculumModule.count({
        where: { worldId: world.id },
      })) + 1;
    const title = input.title?.trim() || "Modul Baru";

    return this.prisma.curriculumModule.create({
      data: {
        worldId: world.id,
        slug:
          input.slug?.trim() || title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        title,
        simpleGoal: input.simpleGoal?.trim() || "Tujuan modul belum diisi.",
        bigIdea: input.bigIdea,
        orderNumber,
        estimatedMinutes: input.estimatedMinutes ?? 20,
        status: "DRAFT",
      },
    });
  }

  async updateCurriculumModule(moduleId: string, input: CurriculumModuleInput) {
    return this.prisma.curriculumModule.update({
      where: { id: moduleId },
      data: {
        bigIdea: input.bigIdea,
        estimatedMinutes: input.estimatedMinutes,
        orderNumber: input.orderNumber,
        simpleGoal: input.simpleGoal,
        slug: input.slug,
        title: input.title,
      },
    });
  }

  async createCurriculumLesson(moduleId: string, input: CurriculumLessonInput) {
    await this.ensureCurriculumModule(moduleId);
    const orderNumber =
      input.orderNumber ??
      (await this.prisma.curriculumLesson.count({ where: { moduleId } })) + 1;

    return this.prisma.curriculumLesson.create({
      data: {
        moduleId,
        orderNumber,
        type: this.parseLessonType(input.type),
        title: input.title?.trim() || "Materi Baru",
        body: input.body?.trim() || "Isi materi belum diisi.",
        examples: input.examples ?? [],
        items: input.items ?? [],
      },
    });
  }

  async updateCurriculumLesson(lessonId: string, input: CurriculumLessonInput) {
    return this.prisma.curriculumLesson.update({
      where: { id: lessonId },
      data: {
        body: input.body,
        examples: input.examples,
        items: input.items,
        orderNumber: input.orderNumber,
        title: input.title,
        type: input.type ? this.parseLessonType(input.type) : undefined,
      },
    });
  }

  async deleteCurriculumLesson(lessonId: string) {
    return this.prisma.curriculumLesson.delete({ where: { id: lessonId } });
  }

  async createCurriculumCaseStudy(
    moduleId: string,
    input: CurriculumCaseStudyInput,
  ) {
    await this.ensureCurriculumModule(moduleId);
    const orderNumber =
      input.orderNumber ??
      (await this.prisma.curriculumCaseStudy.count({ where: { moduleId } })) +
        1;

    return this.prisma.curriculumCaseStudy.create({
      data: {
        moduleId,
        orderNumber,
        title: input.title?.trim() || "Studi Kasus Baru",
        story: input.story?.trim() || "Cerita kasus belum diisi.",
        analysisSteps: input.analysisSteps ?? [],
        commonMistake:
          input.commonMistake?.trim() || "Kesalahan umum belum diisi.",
      },
    });
  }

  async updateCurriculumCaseStudy(
    caseStudyId: string,
    input: CurriculumCaseStudyInput,
  ) {
    return this.prisma.curriculumCaseStudy.update({
      where: { id: caseStudyId },
      data: {
        analysisSteps: input.analysisSteps,
        commonMistake: input.commonMistake,
        orderNumber: input.orderNumber,
        story: input.story,
        title: input.title,
      },
    });
  }

  async deleteCurriculumCaseStudy(caseStudyId: string) {
    return this.prisma.curriculumCaseStudy.delete({
      where: { id: caseStudyId },
    });
  }

  async createRemedialRule(moduleId: string, input: RemedialRuleInput) {
    await this.ensureCurriculumModule(moduleId);

    return this.prisma.remedialRule.create({
      data: {
        moduleId,
        minScoreExclusive: input.minScoreExclusive ?? 60,
        recommendationTitle:
          input.recommendationTitle?.trim() || "Belajar ulang singkat.",
        recommendationMessage:
          input.recommendationMessage?.trim() ||
          "Skill ini akan muncul lagi di tes berikutnya dengan kasus baru.",
        actionType: input.actionType?.trim() || "NEXT_SIMILAR_CASE",
      },
    });
  }

  async updateRemedialRule(ruleId: string, input: RemedialRuleInput) {
    return this.prisma.remedialRule.update({
      where: { id: ruleId },
      data: {
        actionType: input.actionType,
        minScoreExclusive: input.minScoreExclusive,
        recommendationMessage: input.recommendationMessage,
        recommendationTitle: input.recommendationTitle,
      },
    });
  }

  private async ensureCurriculumModule(moduleId: string) {
    const module = await this.prisma.curriculumModule.findUnique({
      where: { id: moduleId },
    });
    if (!module)
      throw new NotFoundException("Modul kurikulum tidak ditemukan.");
    return module;
  }

  private parseLessonType(type?: string) {
    const fallback = CurriculumLessonType.CONCEPT;
    if (!type) return fallback;
    if (
      !Object.values(CurriculumLessonType).includes(
        type as CurriculumLessonType,
      )
    ) {
      throw new BadRequestException("Tipe materi tidak valid.");
    }
    return type as CurriculumLessonType;
  }

  private getStudentProfileId(currentUser: AuthenticatedUser) {
    if (!currentUser.studentProfileId) {
      throw new ForbiddenException("Akses hanya untuk siswa.");
    }

    return currentUser.studentProfileId;
  }
}
