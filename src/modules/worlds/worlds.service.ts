import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { CurriculumLessonType, MissionStatus, QuestionStatus, QuestQuestionType } from "@prisma/client";
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

type QuestQuestionInput = {
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

type ChapterInput = {
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

type QuestInput = {
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

  async findAllForAdmin() {
    return this.prisma.world.findMany({
      where: { isActive: true },
      orderBy: [{ orderNumber: "asc" }, { name: "asc" }],
      select: {
        id: true,
        key: true,
        name: true,
        characterClass: true,
        themeDescription: true,
        orderNumber: true,
        subject: { select: { id: true, code: true, name: true } },
        _count: {
          select: {
            chapters: true,
            quests: true,
            curriculumModules: true,
          },
        },
      },
    });
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
    return this.findCurriculumByWorldKeyInternal(worldKey, false);
  }

  async findAdminCurriculumByWorldKey(worldKey: string) {
    return this.findCurriculumByWorldKeyInternal(worldKey, true);
  }

  private async findCurriculumByWorldKeyInternal(worldKey: string, includeDraft: boolean) {
    const world = await this.prisma.world.findUnique({
      where: { key: worldKey },
      include: {
        subject: { select: { id: true, code: true, name: true } },
        curriculumModules: {
          where: includeDraft ? {} : { status: "ACTIVE" },
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
        status: module.status,
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

  async deleteCurriculumModule(moduleId: string) {
    await this.ensureCurriculumModule(moduleId);
    return this.prisma.curriculumModule.update({
      where: { id: moduleId },
      data: { status: "ARCHIVED" },
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

  async deleteRemedialRule(ruleId: string) {
    return this.prisma.remedialRule.delete({ where: { id: ruleId } });
  }

  async findQuestQuestionsByWorldKey(worldKey: string) {
    const world = await this.prisma.world.findUnique({
      where: { key: worldKey },
      select: {
        id: true,
        key: true,
        name: true,
        quests: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            code: true,
            title: true,
            status: true,
            questions: {
              orderBy: { orderNumber: "asc" },
              select: {
                id: true,
                code: true,
                questionType: true,
                questionText: true,
                difficulty: true,
                status: true,
                orderNumber: true,
                competencyId: true,
                competency: { select: { id: true, code: true, name: true } },
                options: {
                  orderBy: { displayOrder: "asc" },
                  select: {
                    optionId: true,
                    label: true,
                    isCorrect: true,
                  },
                },
                matchingPairs: {
                  orderBy: { pairOrder: "asc" },
                  select: {
                    leftId: true,
                    leftLabel: true,
                    rightId: true,
                    rightLabel: true,
                  },
                },
                orderItems: {
                  orderBy: { correctPosition: "asc" },
                  select: {
                    itemId: true,
                    label: true,
                    correctPosition: true,
                  },
                },
                acceptedAnswers: {
                  select: {
                    answerText: true,
                    normalizedAnswer: true,
                    isPrimary: true,
                  },
                },
                rubricCriteria: {
                  select: {
                    criterion: true,
                    weightPct: true,
                  },
                },
                hotspotAreas: {
                  select: {
                    hotspotId: true,
                    label: true,
                    isCorrect: true,
                  },
                },
                evidenceItems: {
                  orderBy: { displayOrder: "asc" },
                  select: {
                    evidenceId: true,
                    label: true,
                    isCorrectEvidence: true,
                  },
                },
                codeConfig: {
                  select: {
                    language: true,
                    expectedOutput: true,
                  },
                },
              },
            },
          },
        },
        chapters: {
          select: {
            competencies: { select: { id: true, code: true, name: true } },
          },
        },
      },
    });
    if (!world) {
      throw new NotFoundException("Dunia tidak ditemukan.");
    }

    const competencies = world.chapters.flatMap((chapter) => chapter.competencies);

    return {
      world: { id: world.id, key: world.key, name: world.name },
      quests: world.quests.map((quest) => ({
        id: quest.id,
        code: quest.code,
        title: quest.title,
        status: quest.status,
      })),
      competencies,
      questions: world.quests.flatMap((quest) =>
        quest.questions.map((question) => {
          const correctOptions = question.options.filter((option) => option.isCorrect);
          return {
            ...question,
            quest: { id: quest.id, code: quest.code, title: quest.title },
            optionCount: question.options.length,
            answerSummary: this.answerSummaryForQuestion(question),
            answerDetail: {
              options: question.options,
              correctOptions,
              matchingPairs: question.matchingPairs,
              correctOrder: question.orderItems,
              acceptedAnswers: question.acceptedAnswers,
              rubricCriteria: question.rubricCriteria,
              correctHotspots: question.hotspotAreas.filter((area) => area.isCorrect),
              correctEvidence: question.evidenceItems.filter((item) => item.isCorrectEvidence),
              codeConfig: question.codeConfig,
            },
          };
        }),
      ),
    };
  }

  private answerSummaryForQuestion(question: {
    questionType: QuestQuestionType;
    options: { optionId: string; label: string; isCorrect: boolean }[];
    matchingPairs: { leftLabel: string; rightLabel: string }[];
    orderItems: { label: string; correctPosition: number }[];
    acceptedAnswers: { answerText: string; isPrimary: boolean }[];
    rubricCriteria: { criterion: string; weightPct: unknown }[];
    hotspotAreas: { label: string; isCorrect: boolean }[];
    evidenceItems: { label: string; isCorrectEvidence: boolean }[];
    codeConfig: { expectedOutput: string | null } | null;
  }) {
    switch (question.questionType) {
      case QuestQuestionType.SINGLE_CHOICE:
      case QuestQuestionType.MULTIPLE_SELECT:
      case QuestQuestionType.BINARY_CHOICE:
      case QuestQuestionType.IMAGE_CHOICE:
      case QuestQuestionType.AUDIO_CHOICE:
        return question.options
          .filter((option) => option.isCorrect)
          .map((option) => `${option.optionId}. ${option.label}`)
          .join("; ") || "Kunci opsi belum diisi";
      case QuestQuestionType.MATCHING:
        return question.matchingPairs
          .map((pair) => `${pair.leftLabel} -> ${pair.rightLabel}`)
          .join("; ") || "Pasangan belum diisi";
      case QuestQuestionType.ORDERING:
      case QuestQuestionType.TIMELINE_BUILDER:
        return question.orderItems
          .sort((a, b) => a.correctPosition - b.correctPosition)
          .map((item) => `${item.correctPosition}. ${item.label}`)
          .join("; ") || "Urutan belum diisi";
      case QuestQuestionType.SHORT_TEXT:
        return question.acceptedAnswers
          .map((answer) => answer.answerText)
          .join("; ") || "Accepted answer belum diisi";
      case QuestQuestionType.IMAGE_HOTSPOT:
        return question.hotspotAreas
          .filter((area) => area.isCorrect)
          .map((area) => area.label)
          .join("; ") || "Hotspot benar belum diisi";
      case QuestQuestionType.EVIDENCE_BOARD:
        return question.evidenceItems
          .filter((item) => item.isCorrectEvidence)
          .map((item) => item.label)
          .join("; ") || "Evidence benar belum diisi";
      case QuestQuestionType.CODE_INPUT:
        return question.codeConfig?.expectedOutput ?? "Expected output belum diisi";
      case QuestQuestionType.LONG_TEXT:
      case QuestQuestionType.VOICE_RESPONSE:
        return question.rubricCriteria
          .map((rubric) => `${rubric.criterion} (${String(rubric.weightPct)}%)`)
          .join("; ") || "Rubrik review belum diisi";
      default:
        return "Kunci jawaban belum diisi";
    }
  }

  async findImportedCurriculumByWorldKey(worldKey: string) {
    const world = await this.prisma.world.findUnique({
      where: { key: worldKey },
      select: {
        id: true,
        key: true,
        name: true,
        chapters: {
          orderBy: { chapterNumber: "asc" },
          select: {
            id: true,
            chapterCode: true,
            chapterNumber: true,
            title: true,
            story: true,
            difficulty: true,
            estimatedDurationDays: true,
            recommendedSessions: true,
            goal: true,
            status: true,
            subWorldKey: true,
            subWorldName: true,
            competencies: { select: { id: true, code: true, name: true } },
            quests: {
              orderBy: { createdAt: "asc" },
              select: {
                id: true,
                code: true,
                title: true,
                missionType: true,
                objective: true,
                studentInstruction: true,
                estimatedMinutes: true,
                xpRewardFirst: true,
                status: true,
                _count: { select: { questions: true } },
              },
            },
          },
        },
      },
    });
    if (!world) {
      throw new NotFoundException("Dunia tidak ditemukan.");
    }
    return world;
  }

  async createChapter(worldKey: string, input: ChapterInput) {
    const world = await this.prisma.world.findUnique({ where: { key: worldKey } });
    if (!world) throw new NotFoundException("Dunia tidak ditemukan.");
    const chapterNumber =
      input.chapterNumber ??
      (await this.prisma.chapter.count({ where: { worldId: world.id } })) + 1;
    const code = input.chapterCode?.trim() || `${world.key.toUpperCase()}_CH${String(chapterNumber).padStart(2, "0")}`;
    return this.prisma.chapter.create({
      data: {
        worldId: world.id,
        chapterCode: code,
        chapterNumber,
        difficulty: input.difficulty,
        estimatedDurationDays: input.estimatedDurationDays,
        goal: input.goal,
        recommendedSessions: input.recommendedSessions,
        status: this.parseMissionStatus(input.status),
        story: input.story,
        subWorldKey: input.subWorldKey,
        subWorldName: input.subWorldName,
        title: input.title?.trim() || "Kurikulum Baru",
      },
    });
  }

  async updateChapter(chapterId: string, input: ChapterInput) {
    return this.prisma.chapter.update({
      where: { id: chapterId },
      data: {
        chapterCode: input.chapterCode,
        chapterNumber: input.chapterNumber,
        difficulty: input.difficulty,
        estimatedDurationDays: input.estimatedDurationDays,
        goal: input.goal,
        recommendedSessions: input.recommendedSessions,
        status: input.status ? this.parseMissionStatus(input.status) : undefined,
        story: input.story,
        subWorldKey: input.subWorldKey,
        subWorldName: input.subWorldName,
        title: input.title,
      },
    });
  }

  async deleteChapter(chapterId: string) {
    return this.prisma.chapter.update({
      where: { id: chapterId },
      data: { status: MissionStatus.ARCHIVED },
    });
  }

  /**
   * Beda dari deleteChapter() di atas (arsip, reversibel) - ini hapus
   * Chapter beserta semua Quest/QuestQuestion di bawahnya dari database
   * secara permanen, termasuk riwayat pengerjaan siswa (QuestAssignment/
   * QuestAttempt/QuestAnswer). Kalau sudah ada siswa yang mengerjakan dan
   * `force` tidak di-set true, ditolak dulu supaya admin sadar konsekuensinya
   * sebelum data hilang tanpa bisa dikembalikan.
   */
  async permanentlyDeleteChapter(chapterId: string, force = false) {
    const chapter = await this.prisma.chapter.findUnique({ where: { id: chapterId } });
    if (!chapter) throw new NotFoundException("Kurikulum tidak ditemukan.");

    const quests = await this.prisma.quest.findMany({
      where: { chapterId },
      select: { id: true },
    });

    if (!force) {
      const assignmentCount = await this.prisma.questAssignment.count({
        where: { questId: { in: quests.map((quest) => quest.id) } },
      });
      if (assignmentCount > 0) {
        throw new BadRequestException(
          `Ada ${assignmentCount} progres siswa di bawah kurikulum ini. Data itu akan hilang permanen. Konfirmasi ulang (force) untuk tetap menghapus.`,
        );
      }
    }

    for (const quest of quests) {
      await this.permanentlyDeleteQuest(quest.id, true);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.competency.updateMany({ where: { chapterId }, data: { chapterId: null } });
      await tx.chapter.updateMany({ where: { prerequisiteChapterId: chapterId }, data: { prerequisiteChapterId: null } });
      await tx.chapter.delete({ where: { id: chapterId } });
    });
  }

  async createQuest(chapterId: string, input: QuestInput) {
    const chapter = await this.prisma.chapter.findUnique({ where: { id: chapterId } });
    if (!chapter) throw new NotFoundException("Kurikulum tidak ditemukan.");
    const count = await this.prisma.quest.count({ where: { chapterId } });
    const code = input.code?.trim() || `${chapter.chapterCode}_M${String(count + 1).padStart(3, "0")}`;
    return this.prisma.quest.create({
      data: {
        chapterId,
        worldId: chapter.worldId,
        code,
        estimatedMinutes: input.estimatedMinutes ?? 10,
        missionType: input.missionType,
        objective: input.objective,
        status: this.parseMissionStatus(input.status),
        story: input.story,
        studentInstruction: input.studentInstruction,
        title: input.title?.trim() || "Misi Baru",
        xpRewardFirst: input.xpRewardFirst ?? 0,
        hints: [],
      },
    });
  }

  async updateQuest(questId: string, input: QuestInput) {
    return this.prisma.quest.update({
      where: { id: questId },
      data: {
        code: input.code,
        estimatedMinutes: input.estimatedMinutes,
        missionType: input.missionType,
        objective: input.objective,
        status: input.status ? this.parseMissionStatus(input.status) : undefined,
        story: input.story,
        studentInstruction: input.studentInstruction,
        title: input.title,
        xpRewardFirst: input.xpRewardFirst,
      },
    });
  }

  async deleteQuest(questId: string) {
    return this.prisma.quest.update({
      where: { id: questId },
      data: { status: MissionStatus.ARCHIVED },
    });
  }

  /**
   * Beda dari deleteQuest() di atas (arsip, reversibel) - ini hapus Quest
   * beserta semua QuestQuestion (dan 9 tabel anak tipe-soalnya) plus
   * riwayat pengerjaan siswa (QuestAssignment/QuestAttempt/QuestAnswer)
   * secara permanen dari database. Lihat catatan `force` di
   * permanentlyDeleteChapter() - guard yang sama berlaku di sini.
   */
  async permanentlyDeleteQuest(questId: string, force = false) {
    const quest = await this.prisma.quest.findUnique({ where: { id: questId } });
    if (!quest) throw new NotFoundException("Misi tidak ditemukan.");

    if (!force) {
      const assignmentCount = await this.prisma.questAssignment.count({ where: { questId } });
      if (assignmentCount > 0) {
        throw new BadRequestException(
          `Misi ini sudah dikerjakan ${assignmentCount} kali oleh siswa. Progres itu akan hilang permanen. Konfirmasi ulang (force) untuk tetap menghapus.`,
        );
      }
    }

    const questions = await this.prisma.questQuestion.findMany({
      where: { questId },
      select: { id: true },
    });
    const questionIds = questions.map((question) => question.id);

    await this.prisma.$transaction(async (tx) => {
      if (questionIds.length > 0) {
        await tx.questAnswer.deleteMany({ where: { questQuestionId: { in: questionIds } } });
        await tx.questQuestionOption.deleteMany({ where: { questQuestionId: { in: questionIds } } });
        await tx.questMatchingPair.deleteMany({ where: { questQuestionId: { in: questionIds } } });
        await tx.questOrderItem.deleteMany({ where: { questQuestionId: { in: questionIds } } });
        await tx.questAcceptedAnswer.deleteMany({ where: { questQuestionId: { in: questionIds } } });
        await tx.questRubricCriterion.deleteMany({ where: { questQuestionId: { in: questionIds } } });
        await tx.questMedia.deleteMany({ where: { questQuestionId: { in: questionIds } } });
        await tx.questHotspotArea.deleteMany({ where: { questQuestionId: { in: questionIds } } });
        await tx.questEvidenceItem.deleteMany({ where: { questQuestionId: { in: questionIds } } });
        await tx.questCodeConfig.deleteMany({ where: { questQuestionId: { in: questionIds } } });
        await tx.questQuestion.deleteMany({ where: { id: { in: questionIds } } });
      }

      await tx.questAttempt.deleteMany({ where: { assignment: { questId } } });
      await tx.questAssignment.deleteMany({ where: { questId } });
      await tx.quest.delete({ where: { id: questId } });
    });
  }

  async createQuestQuestion(questId: string, input: QuestQuestionInput) {
    const quest = await this.prisma.quest.findUnique({ where: { id: questId } });
    if (!quest) {
      throw new NotFoundException("Quest tidak ditemukan.");
    }
    if (!input.competencyId) {
      throw new BadRequestException("Kompetensi wajib diisi.");
    }

    const orderNumber =
      input.orderNumber ??
      (await this.prisma.questQuestion.count({ where: { questId } })) + 1;
    const code = input.code?.trim() || `${quest.code}-Q${String(orderNumber).padStart(3, "0")}`;

    return this.prisma.questQuestion.create({
      data: {
        questId,
        code,
        competencyId: input.competencyId,
        difficulty: input.difficulty,
        instruction: input.instruction,
        measurementCategory: input.measurementCategory,
        orderNumber,
        questionText: input.questionText?.trim() || "Pertanyaan belum diisi.",
        questionType: this.parseQuestQuestionType(input.questionType),
        status: this.parseQuestionStatus(input.status),
        stimulusText: input.stimulusText,
      },
    });
  }

  async updateQuestQuestion(questionId: string, input: QuestQuestionInput) {
    return this.prisma.questQuestion.update({
      where: { id: questionId },
      data: {
        code: input.code,
        competencyId: input.competencyId,
        difficulty: input.difficulty,
        instruction: input.instruction,
        measurementCategory: input.measurementCategory,
        orderNumber: input.orderNumber,
        questionText: input.questionText,
        questionType: input.questionType ? this.parseQuestQuestionType(input.questionType) : undefined,
        status: input.status ? this.parseQuestionStatus(input.status) : undefined,
        stimulusText: input.stimulusText,
      },
    });
  }

  async deleteQuestQuestion(questionId: string) {
    return this.prisma.$transaction(async (tx) => {
      // Kalau soal ini sudah pernah dijawab siswa, QuestAnswer masih
      // mereferensikan questionId ini - tanpa dibersihkan dulu, delete di
      // bawah akan gagal kena constraint FK. Ini permanent delete (bukan
      // arsip), jadi jawaban siswa untuk soal ini memang ikut hilang.
      await tx.questAnswer.deleteMany({ where: { questQuestionId: questionId } });
      await tx.questQuestionOption.deleteMany({ where: { questQuestionId: questionId } });
      await tx.questMatchingPair.deleteMany({ where: { questQuestionId: questionId } });
      await tx.questOrderItem.deleteMany({ where: { questQuestionId: questionId } });
      await tx.questAcceptedAnswer.deleteMany({ where: { questQuestionId: questionId } });
      await tx.questRubricCriterion.deleteMany({ where: { questQuestionId: questionId } });
      await tx.questMedia.deleteMany({ where: { questQuestionId: questionId } });
      await tx.questHotspotArea.deleteMany({ where: { questQuestionId: questionId } });
      await tx.questEvidenceItem.deleteMany({ where: { questQuestionId: questionId } });
      await tx.questCodeConfig.deleteMany({ where: { questQuestionId: questionId } });
      return tx.questQuestion.delete({ where: { id: questionId } });
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

  private parseQuestQuestionType(type?: string) {
    const fallback = QuestQuestionType.SINGLE_CHOICE;
    if (!type) return fallback;
    if (!Object.values(QuestQuestionType).includes(type as QuestQuestionType)) {
      throw new BadRequestException("Tipe pertanyaan tidak valid.");
    }
    return type as QuestQuestionType;
  }

  private parseQuestionStatus(status?: string) {
    const fallback = QuestionStatus.DRAFT;
    if (!status) return fallback;
    if (!Object.values(QuestionStatus).includes(status as QuestionStatus)) {
      throw new BadRequestException("Status pertanyaan tidak valid.");
    }
    return status as QuestionStatus;
  }

  private parseMissionStatus(status?: string) {
    const fallback = MissionStatus.ACTIVE;
    if (!status) return fallback;
    if (!Object.values(MissionStatus).includes(status as MissionStatus)) {
      throw new BadRequestException("Status tidak valid.");
    }
    return status as MissionStatus;
  }

  private getStudentProfileId(currentUser: AuthenticatedUser) {
    if (!currentUser.studentProfileId) {
      throw new ForbiddenException("Akses hanya untuk siswa.");
    }

    return currentUser.studentProfileId;
  }
}
