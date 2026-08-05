import { Injectable, NotFoundException } from "@nestjs/common";
import { MissionStatus, Prisma } from "@prisma/client";
import { PrismaService } from "../../database/prisma/prisma.service";
import { SaveOnboardingDto } from "../student-onboarding/dto/save-onboarding.dto";
import { SavePlacementAnswerDto } from "../student-placement/dto/save-placement-answer.dto";

const DEFAULT_WORLD_KEY = "scientia";

@Injectable()
export class StudentPrototypeService {
  constructor(private readonly prisma: PrismaService) {}

  async startSession() {
    const student = await this.prisma.studentProfile.create({
      data: {
        fullName: "Pengguna BaleBelajar",
        gradeLevel: 10,
      },
    });

    return {
      studentProfileId: student.id,
      displayName: student.fullName,
      nextRoute: "ONBOARDING",
    };
  }

  async saveOnboarding(studentProfileId: string, dto: SaveOnboardingDto) {
    await this.assertStudent(studentProfileId);
    return this.prisma.studentOnboarding.upsert({
      where: { studentProfileId },
      create: {
        studentProfileId,
        ...this.toOnboardingData(dto),
      },
      update: this.toOnboardingData(dto),
    });
  }

  async completeOnboarding(studentProfileId: string, dto: SaveOnboardingDto) {
    await this.assertStudent(studentProfileId);
    const onboarding = await this.prisma.studentOnboarding.upsert({
      where: { studentProfileId },
      create: {
        studentProfileId,
        ...this.toOnboardingData(dto),
        completedAt: new Date(),
      },
      update: {
        ...this.toOnboardingData(dto),
        completedAt: new Date(),
      },
    });

    return { onboarding, nextRoute: "PLACEMENT_TEST" };
  }

  async startPlacement(studentProfileId: string, worldKey?: string) {
    await this.assertStudent(studentProfileId);
    const selectedWorldKey = await this.resolveWorldKey(worldKey);
    const totalQuestions = await this.getPlacementTotal(selectedWorldKey);
    const attempt = await this.prisma.placementAttempt.create({
      data: {
        studentProfileId,
        worldKey: selectedWorldKey,
        totalQuestions,
      },
    });

    return { attemptId: attempt.id, totalQuestions };
  }

  async getPlacementQuestions(studentProfileId: string) {
    const student = await this.assertStudent(studentProfileId);
    const selectedWorldKey = await this.resolveWorldKey(student.onboarding?.learningWorld);
    const questions = await this.getPlacementQuestionPayloads(selectedWorldKey);
    return {
      totalQuestions: questions.length,
      questions,
    };
  }

  async getBaleVerse(studentProfileId: string) {
    const student = await this.prisma.studentProfile.findUnique({
      where: { id: studentProfileId },
      include: {
        onboarding: true,
        gameProfile: true,
        placementAttempts: {
          include: { analysis: true },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });
    if (!student) throw new NotFoundException("Sesi siswa tidak ditemukan.");

    const analysis = student.placementAttempts[0]?.analysis;
    const selectedWorld = await this.resolveWorldKey(
      analysis?.selectedWorld ?? student.onboarding?.learningWorld,
    );

    const worlds = await this.prisma.world.findMany({
      where: { isActive: true },
      include: {
        subject: { select: { name: true } },
        worldProgress: { where: { studentProfileId }, take: 1 },
        quests: {
          where: { status: MissionStatus.ACTIVE },
          orderBy: { createdAt: "asc" },
          take: 3,
        },
        chapters: { orderBy: { chapterNumber: "asc" }, take: 5 },
      },
      orderBy: { orderNumber: "asc" },
    });
    if (worlds.length === 0) {
      throw new NotFoundException(
        "Belum ada data dunia aktif di database. Jalankan import dan normalisasi kurikulum.",
      );
    }

    const selectedWorldData =
      worlds.find((world) => world.key === selectedWorld) ?? worlds[0];
    const activeQuest =
      selectedWorldData.quests[0] ?? worlds.flatMap((world) => world.quests)[0];

    return {
      profile: {
        name: student.fullName,
        rank: student.gameProfile
          ? this.rankForLevel(student.gameProfile.accountLevel)
          : "Pemula",
        level: student.gradeLevel ?? 10,
        foundation: analysis?.recommendedLevel ?? "FOUNDATION_1",
      },
      stats: {
        xp: student.gameProfile?.accountXp ?? 0,
        streak: student.gameProfile?.streakCurrent ?? 0,
        weeklyCompleted: Math.min(
          student.gameProfile?.streakCurrent ?? 0,
          student.gameProfile?.streakTargetPerWeek ?? 3,
        ),
        weeklyTarget: student.gameProfile?.streakTargetPerWeek ?? 3,
      },
      selectedWorld: selectedWorldData.key,
      todayMission: activeQuest
        ? this.questToMission(activeQuest)
        : await this.firstMission(selectedWorldData.key),
      worlds: worlds.map((world) => ({
        key: world.key,
        name: world.name,
        subject: world.subject.name,
        description: world.themeDescription ?? world.characterClass,
        exampleMission: world.quests[0]?.title ?? "Misi belajar pertama",
        mastery: world.worldProgress[0]?.worldLevel ?? 1,
        unlocked: true,
      })),
      missions: selectedWorldData.quests.map((quest, index) => ({
        id: quest.id,
        title: quest.title,
        description: quest.objective ?? quest.studentInstruction ?? quest.story ?? "",
        durationMinutes: quest.estimatedMinutes,
        rewardXp: quest.xpRewardFirst,
        active: index === 0,
      })),
      learningPath: selectedWorldData.chapters.map((chapter, index) => ({
        step: chapter.chapterNumber,
        title: chapter.title,
        completed: index === 0,
        active: index === 1,
        locked: index > 1,
        stars: index === 0 ? 3 : index === 1 ? 1 : 0,
      })),
    };
  }

  async savePlacementAnswer(
    attemptId: string,
    questionId: string,
    dto: SavePlacementAnswerDto,
  ) {
    await this.assertAttempt(attemptId);
    return this.prisma.placementAnswer.upsert({
      where: { attemptId_questionId: { attemptId, questionId } },
      create: {
        attemptId,
        questionId,
        questionType: dto.questionType,
        answer: dto.answer as Prisma.InputJsonValue,
        isSkipped: dto.isSkipped ?? false,
        clientAnsweredAt: dto.clientAnsweredAt
          ? new Date(dto.clientAnsweredAt)
          : undefined,
      },
      update: {
        questionType: dto.questionType,
        answer: dto.answer as Prisma.InputJsonValue,
        isSkipped: dto.isSkipped ?? false,
        clientAnsweredAt: dto.clientAnsweredAt
          ? new Date(dto.clientAnsweredAt)
          : undefined,
      },
    });
  }

  async skipPlacementAnswer(
    attemptId: string,
    questionId: string,
    questionType = "UNKNOWN",
  ) {
    return this.savePlacementAnswer(attemptId, questionId, {
      questionType,
      isSkipped: true,
      answer: { skipped: true },
      clientAnsweredAt: new Date().toISOString(),
    });
  }

  async submitPlacement(attemptId: string) {
    await this.assertAttempt(attemptId);
    await this.prisma.placementAttempt.update({
      where: { id: attemptId },
      data: { status: "SUBMITTED", submittedAt: new Date() },
    });

    return this.analyze(attemptId);
  }

  async analyze(attemptId: string) {
    const attempt = await this.prisma.placementAttempt.findUnique({
      where: { id: attemptId },
      include: { answers: true },
    });
    if (!attempt) throw new NotFoundException("Attempt tidak ditemukan.");

    const totalQuestions =
      attempt.totalQuestions || (await this.getPlacementTotal(attempt.worldKey ?? undefined));
    const answered = attempt.answers.filter((answer) => !answer.isSkipped);
    const skipped = attempt.answers.length - answered.length;
    const completionRatio = totalQuestions === 0 ? 0 : answered.length / totalQuestions;
    const selectedWorld = await this.resolveWorldKey(attempt.worldKey);
    const recommendedLevel =
      completionRatio >= 0.75
        ? "FOUNDATION_3"
        : completionRatio >= 0.45
          ? "FOUNDATION_2"
          : "FOUNDATION_1";

    return this.prisma.placementAnalysisResult.upsert({
      where: { attemptId },
      create: {
        attemptId,
        recommendedLevel,
        selectedWorld,
        strengths: ["PATTERN_RECOGNITION", "IMAGE_REASONING", "ORDERING"],
        focusAreas: ["EXPLAIN_REASONING", "VERIFY_INFORMATION", "STEP_BY_STEP"],
        firstMission: await this.firstMission(selectedWorld),
        scoreSummary: {
          answered: answered.length,
          skipped,
          totalQuestions,
          completionRatio,
        },
      },
      update: {
        status: "READY",
        recommendedLevel,
        selectedWorld,
        strengths: ["PATTERN_RECOGNITION", "IMAGE_REASONING", "ORDERING"],
        focusAreas: ["EXPLAIN_REASONING", "VERIFY_INFORMATION", "STEP_BY_STEP"],
        firstMission: await this.firstMission(selectedWorld),
        scoreSummary: {
          answered: answered.length,
          skipped,
          totalQuestions,
          completionRatio,
        },
      },
    });
  }

  private toOnboardingData(dto: SaveOnboardingDto) {
    return {
      learningGoal: dto.learningGoal,
      learningWorld: dto.learningWorld,
      gradeChoice: dto.gradeChoice,
      selfReportedLevel: dto.selfReportedLevel,
      learningFormats: dto.learningFormats ?? [],
      dailyDuration: dto.dailyDuration,
      studyTime: dto.studyTime,
      reminderPreference: dto.reminderPreference,
      rawAnswers: dto.rawAnswers as Prisma.InputJsonValue,
    };
  }

  private async firstMission(worldKey: string) {
    const quest = await this.prisma.quest.findFirst({
      where: { world: { key: worldKey }, status: MissionStatus.ACTIVE },
      orderBy: { createdAt: "asc" },
    });
    if (quest) return this.questToMission(quest);
    return {
      id: `first-${worldKey}`,
      title: "Misi belajar pertama",
      durationMinutes: 10,
      activityCount: 0,
      rewardXp: 0,
    };
  }

  private questToMission(quest: {
    id: string;
    title: string;
    estimatedMinutes: number;
    xpRewardFirst: number;
  }) {
    return {
      id: quest.id,
      title: quest.title,
      durationMinutes: quest.estimatedMinutes,
      activityCount: 5,
      rewardXp: quest.xpRewardFirst,
    };
  }

  private async getPlacementQuestionPayloads(worldKey?: string) {
    const resolvedWorldKey = await this.resolveWorldKey(worldKey);
    const templates = await this.prisma.placementQuestionTemplate.findMany({
      where: {
        isActive: true,
        OR: [{ worldKey: resolvedWorldKey }, { worldKey: null }],
      },
      orderBy: { orderNumber: "asc" },
    });
    if (templates.length === 0) {
      throw new NotFoundException(
        "Template placement belum tersedia di database. Jalankan normalize:curriculum.",
      );
    }
    return templates.map((template) => template.payload as Record<string, unknown>);
  }

  private async getPlacementTotal(worldKey?: string) {
    return (await this.getPlacementQuestionPayloads(worldKey)).length;
  }

  private async resolveWorldKey(rawWorldKey?: string | null) {
    const normalized = rawWorldKey?.toLowerCase();
    const aliases: Record<string, string> = {
      sains: DEFAULT_WORLD_KEY,
      sci: DEFAULT_WORLD_KEY,
      science: DEFAULT_WORLD_KEY,
      try_all: DEFAULT_WORLD_KEY,
      numeria: DEFAULT_WORLD_KEY,
      kodex: DEFAULT_WORLD_KEY,
      detectivia: DEFAULT_WORLD_KEY,
      bahasa: DEFAULT_WORLD_KEY,
    };
    const key = normalized ? aliases[normalized] ?? normalized : DEFAULT_WORLD_KEY;
    const world = await this.prisma.world.findFirst({
      where: { key, isActive: true },
      select: { key: true },
    });
    if (world) return world.key;
    const firstWorld = await this.prisma.world.findFirst({
      where: { isActive: true },
      orderBy: { orderNumber: "asc" },
      select: { key: true },
    });
    if (!firstWorld) {
      throw new NotFoundException(
        "Belum ada data dunia aktif di database. Jalankan import dan normalisasi kurikulum.",
      );
    }
    return firstWorld.key;
  }

  private rankForLevel(level: number) {
    if (level >= 20) return "Mentor Muda";
    if (level >= 10) return "Penjelajah";
    if (level >= 5) return "Tunas II";
    return "Pemula";
  }

  private async assertStudent(studentProfileId: string) {
    const student = await this.prisma.studentProfile.findUnique({
      where: { id: studentProfileId },
      include: { onboarding: true },
    });
    if (!student) throw new NotFoundException("Sesi siswa tidak ditemukan.");
    return student;
  }

  private async assertAttempt(attemptId: string) {
    const attempt = await this.prisma.placementAttempt.findUnique({
      where: { id: attemptId },
    });
    if (!attempt) throw new NotFoundException("Attempt tidak ditemukan.");
  }
}
