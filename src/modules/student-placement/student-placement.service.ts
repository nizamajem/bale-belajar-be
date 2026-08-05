import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { AuthenticatedUser } from "../../common/types/authenticated-user.type";
import { PrismaService } from "../../database/prisma/prisma.service";
import { SavePlacementAnswerDto } from "./dto/save-placement-answer.dto";
import { StartPlacementDto } from "./dto/start-placement.dto";

@Injectable()
export class StudentPlacementService {
  constructor(private readonly prisma: PrismaService) {}

  async start(currentUser: AuthenticatedUser, dto: StartPlacementDto) {
    const studentProfileId = this.getStudentProfileId(currentUser);
    const totalQuestions = await this.getPlacementTotal(dto.worldKey);

    const attempt = await this.prisma.placementAttempt.create({
      data: {
        studentProfileId,
        worldKey: dto.worldKey,
        totalQuestions,
      },
    });

    return {
      attempt,
      totalQuestions,
    };
  }

  async getLatest(currentUser: AuthenticatedUser) {
    const studentProfileId = this.getStudentProfileId(currentUser);
    return this.prisma.placementAttempt.findFirst({
      where: { studentProfileId },
      include: { answers: true, analysis: true },
      orderBy: { createdAt: "desc" },
    });
  }

  async getQuestions(currentUser: AuthenticatedUser) {
    const studentProfileId = this.getStudentProfileId(currentUser);
    const student = await this.prisma.studentProfile.findUnique({
      where: { id: studentProfileId },
      include: { onboarding: true },
    });
    const worldKey = await this.resolveWorldKey(student?.onboarding?.learningWorld);
    const templates = await this.getPlacementQuestionTemplates(worldKey);
    return {
      totalQuestions: templates.length,
      questions: templates.map((template) => template.payload),
    };
  }

  async saveAnswer(
    currentUser: AuthenticatedUser,
    attemptId: string,
    questionId: string,
    dto: SavePlacementAnswerDto,
  ) {
    await this.assertOwnAttempt(currentUser, attemptId);

    return this.prisma.placementAnswer.upsert({
      where: {
        attemptId_questionId: {
          attemptId,
          questionId,
        },
      },
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

  async skipAnswer(
    currentUser: AuthenticatedUser,
    attemptId: string,
    questionId: string,
    questionType = "UNKNOWN",
  ) {
    return this.saveAnswer(currentUser, attemptId, questionId, {
      questionType,
      isSkipped: true,
      answer: { skipped: true },
      clientAnsweredAt: new Date().toISOString(),
    });
  }

  async submit(currentUser: AuthenticatedUser, attemptId: string) {
    await this.assertOwnAttempt(currentUser, attemptId);

    const attempt = await this.prisma.placementAttempt.update({
      where: { id: attemptId },
      data: {
        status: "SUBMITTED",
        submittedAt: new Date(),
      },
      include: { answers: true },
    });

    const analysis = await this.upsertAnalysis(attempt.id);
    return { attempt, analysis };
  }

  async analyze(currentUser: AuthenticatedUser, attemptId: string) {
    await this.assertOwnAttempt(currentUser, attemptId);
    return this.upsertAnalysis(attemptId);
  }

  async getAnalysis(currentUser: AuthenticatedUser, attemptId: string) {
    await this.assertOwnAttempt(currentUser, attemptId);
    const analysis = await this.prisma.placementAnalysisResult.findUnique({
      where: { attemptId },
    });
    if (analysis) return analysis;
    return this.upsertAnalysis(attemptId);
  }

  async getLatestResult(currentUser: AuthenticatedUser) {
    const latest = await this.getLatest(currentUser);
    if (!latest) return null;
    if (latest.analysis) return latest.analysis;
    return this.upsertAnalysis(latest.id);
  }

  private async upsertAnalysis(attemptId: string) {
    const attempt = await this.prisma.placementAttempt.findUnique({
      where: { id: attemptId },
      include: { answers: true },
    });

    if (!attempt) throw new NotFoundException("Attempt tidak ditemukan.");

    const totalQuestions =
      attempt.totalQuestions || (await this.getPlacementTotal(attempt.worldKey ?? undefined));
    const answered = attempt.answers.filter((answer) => !answer.isSkipped);
    const skipped = attempt.answers.filter((answer) => answer.isSkipped);
    const completionRatio = totalQuestions === 0 ? 0 : answered.length / totalQuestions;
    const recommendedLevel =
      completionRatio >= 0.75
        ? "FOUNDATION_3"
        : completionRatio >= 0.45
          ? "FOUNDATION_2"
          : "FOUNDATION_1";
    const selectedWorld = await this.resolveWorldKey(attempt.worldKey);
    const strengths = this.pickStrengths(answered.map((answer) => answer.questionType));
    const focusAreas = skipped.length > 4
      ? ["STEP_BY_STEP", "VERIFY_INFORMATION", "EXPLAIN_REASONING"]
      : ["EXPLAIN_REASONING", "VERIFY_INFORMATION", "CONSISTENCY"];

    return this.prisma.placementAnalysisResult.upsert({
      where: { attemptId },
      create: {
        attemptId,
        recommendedLevel,
        selectedWorld,
        strengths,
        focusAreas,
        firstMission: await this.firstMission(selectedWorld),
        scoreSummary: {
          answered: answered.length,
          skipped: skipped.length,
          totalQuestions,
          completionRatio,
        },
      },
      update: {
        status: "READY",
        recommendedLevel,
        selectedWorld,
        strengths,
        focusAreas,
        firstMission: await this.firstMission(selectedWorld),
        scoreSummary: {
          answered: answered.length,
          skipped: skipped.length,
          totalQuestions,
          completionRatio,
        },
      },
    });
  }

  private pickStrengths(questionTypes: string[]) {
    const types = new Set(questionTypes);
    const strengths = [];
    if (types.has("IMAGE_CHOICE") || types.has("IMAGE_HOTSPOT")) {
      strengths.push("IMAGE_REASONING");
    }
    if (types.has("ORDERING") || types.has("TIMELINE_BUILDER")) {
      strengths.push("SEQUENCE_THINKING");
    }
    if (types.has("SINGLE_CHOICE") || types.has("BINARY_CHOICE")) {
      strengths.push("CONCEPT_CHECK");
    }
    return strengths.length > 0
      ? strengths.slice(0, 3)
      : ["PATTERN_RECOGNITION", "IMAGE_REASONING", "ORDERING"];
  }

  private async getPlacementTotal(worldKey?: string | null) {
    const normalizedWorldKey = await this.resolveWorldKey(worldKey);
    return (await this.getPlacementQuestionTemplates(normalizedWorldKey)).length;
  }

  private async getPlacementQuestionTemplates(worldKey?: string | null) {
    const templates = await this.prisma.placementQuestionTemplate.findMany({
      where: {
        isActive: true,
        OR: [{ worldKey }, { worldKey: null }],
      },
      orderBy: { orderNumber: "asc" },
    });
    if (templates.length > 0) return templates;
    return this.prisma.placementQuestionTemplate.findMany({
      where: { isActive: true },
      orderBy: { orderNumber: "asc" },
    });
  }

  private async resolveWorldKey(worldKey?: string | null) {
    const normalized = worldKey?.toLowerCase();
    const aliases: Record<string, string> = {
      sains: "scientia",
      science: "scientia",
      scientia: "scientia",
      try_all: "scientia",
      tryall: "scientia",
      numeria: "numeria",
      kodex: "kodex",
      detectivia: "detectivia",
      bahasa: "bahasa",
    };
    const candidate = normalized ? aliases[normalized] ?? normalized : undefined;
    if (candidate) {
      const existing = await this.prisma.world.findUnique({
        where: { key: candidate },
        select: { key: true },
      });
      if (existing) return existing.key;
    }

    const firstWorld = await this.prisma.world.findFirst({
      where: { isActive: true },
      orderBy: { orderNumber: "asc" },
      select: { key: true },
    });
    return firstWorld?.key ?? candidate ?? "scientia";
  }

  private async firstMission(worldKey: string) {
    const quest = await this.prisma.quest.findFirst({
      where: {
        status: "ACTIVE",
        world: { key: worldKey },
      },
      orderBy: { code: "asc" },
      include: {
        _count: { select: { questions: true } },
      },
    });

    return {
      id: quest?.id ?? `first-${worldKey}`,
      title: quest?.title ?? "Misi Pertama BaleBelajar",
      durationMinutes: quest?.estimatedMinutes ?? 8,
      activityCount: quest?._count.questions ?? 0,
      rewardXp: quest?.xpRewardFirst ?? 30,
    };
  }

  private async assertOwnAttempt(
    currentUser: AuthenticatedUser,
    attemptId: string,
  ) {
    const studentProfileId = this.getStudentProfileId(currentUser);
    const attempt = await this.prisma.placementAttempt.findFirst({
      where: { id: attemptId, studentProfileId },
    });

    if (!attempt) throw new NotFoundException("Attempt tidak ditemukan.");
    return attempt;
  }

  private getStudentProfileId(currentUser: AuthenticatedUser) {
    if (!currentUser.studentProfileId) {
      throw new ForbiddenException("Akses hanya untuk siswa.");
    }
    return currentUser.studentProfileId;
  }
}
