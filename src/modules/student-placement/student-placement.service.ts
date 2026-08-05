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
    await this.recordPlacementAnswerEvaluations(attempt.answers);

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

  private async recordPlacementAnswerEvaluations(
    answers: { id: string; questionId: string; answer: Prisma.JsonValue; isSkipped: boolean }[],
  ) {
    if (answers.length === 0) return;
    const questions = await this.prisma.questQuestion.findMany({
      where: { code: { in: answers.map((answer) => answer.questionId) } },
      include: {
        competency: { select: { id: true, code: true, name: true } },
        options: { select: { optionId: true, label: true, isCorrect: true } },
      },
    });
    const questionByCode = new Map(questions.map((question) => [question.code, question]));

    await Promise.all(
      answers.map((answer) => {
        const question = questionByCode.get(answer.questionId);
        const correctOption = question?.options.find((option) => option.isCorrect);
        const submitted = this.readSelectedOptionId(answer.answer);
        const isCorrect =
          answer.isSkipped || !question || !correctOption || !submitted
            ? false
            : submitted === correctOption.optionId;
        const nextAnswer: Record<string, unknown> =
          answer.answer && typeof answer.answer === "object" && !Array.isArray(answer.answer)
            ? { ...(answer.answer as Record<string, unknown>) }
            : { value: answer.answer };

        nextAnswer.evaluation = {
          score: isCorrect ? 100 : 0,
          isCorrect,
          selectedOptionId: submitted ?? null,
          correctOptionId: correctOption?.optionId ?? null,
          correctOptionLabel: correctOption?.label ?? null,
          competency: question?.competency ?? null,
          evaluatedAt: new Date().toISOString(),
        };

        return this.prisma.placementAnswer.update({
          where: { id: answer.id },
          data: { answer: nextAnswer as Prisma.InputJsonValue },
        });
      }),
    );
  }

  private readSelectedOptionId(answer: Prisma.JsonValue) {
    if (!answer || typeof answer !== "object" || Array.isArray(answer)) return null;
    const payload = answer as Record<string, unknown>;
    const selected = payload.selectedOptionId ?? payload.value;
    return typeof selected === "string" ? selected : null;
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
        questionType: "SINGLE_CHOICE",
        OR: [{ worldKey }, { worldKey: null }],
      },
      orderBy: { orderNumber: "asc" },
    });
    const readyTemplates = templates.filter((template) =>
      this.isReadySingleChoicePayload(template.payload),
    );
    if (readyTemplates.length > 0) return readyTemplates;
    const fallback = await this.prisma.placementQuestionTemplate.findMany({
      where: { isActive: true, questionType: "SINGLE_CHOICE" },
      orderBy: { orderNumber: "asc" },
    });
    return fallback.filter((template) =>
      this.isReadySingleChoicePayload(template.payload),
    );
  }

  private isReadySingleChoicePayload(payload: Prisma.JsonValue) {
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      return false;
    }
    const question = payload as Record<string, unknown>;
    if (question.questionType !== "SINGLE_CHOICE") return false;
    const options = question.options;
    if (!Array.isArray(options) || options.length < 2) return false;
    return options.every((option) => {
      if (!option || typeof option !== "object" || Array.isArray(option)) {
        return false;
      }
      const item = option as Record<string, unknown>;
      return typeof item.id === "string" && typeof item.label === "string" && item.label.trim().length > 0;
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
