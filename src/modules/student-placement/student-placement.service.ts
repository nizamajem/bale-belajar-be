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

const TOTAL_PLACEMENT_QUESTIONS = 13;

@Injectable()
export class StudentPlacementService {
  constructor(private readonly prisma: PrismaService) {}

  async start(currentUser: AuthenticatedUser, dto: StartPlacementDto) {
    const studentProfileId = this.getStudentProfileId(currentUser);

    const attempt = await this.prisma.placementAttempt.create({
      data: {
        studentProfileId,
        worldKey: dto.worldKey,
        totalQuestions: TOTAL_PLACEMENT_QUESTIONS,
      },
    });

    return {
      attempt,
      totalQuestions: TOTAL_PLACEMENT_QUESTIONS,
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

    const answered = attempt.answers.filter((answer) => !answer.isSkipped);
    const skipped = attempt.answers.filter((answer) => answer.isSkipped);
    const completionRatio = answered.length / TOTAL_PLACEMENT_QUESTIONS;
    const recommendedLevel =
      completionRatio >= 0.75
        ? "FOUNDATION_3"
        : completionRatio >= 0.45
          ? "FOUNDATION_2"
          : "FOUNDATION_1";
    const selectedWorld = attempt.worldKey ?? "DETECTIVIA";
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
        firstMission: this.firstMission(selectedWorld),
        scoreSummary: {
          answered: answered.length,
          skipped: skipped.length,
          totalQuestions: TOTAL_PLACEMENT_QUESTIONS,
          completionRatio,
        },
      },
      update: {
        status: "READY",
        recommendedLevel,
        selectedWorld,
        strengths,
        focusAreas,
        firstMission: this.firstMission(selectedWorld),
        scoreSummary: {
          answered: answered.length,
          skipped: skipped.length,
          totalQuestions: TOTAL_PLACEMENT_QUESTIONS,
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

  private firstMission(worldKey: string) {
    const title =
      worldKey === "KODEX"
        ? "Gerbang Distribusi"
        : worldKey === "NUMERIA"
          ? "Pola Angka Pertama"
          : "Misteri Jadwal yang Berubah";

    return {
      id: `first-${worldKey.toLowerCase()}`,
      title,
      durationMinutes: 8,
      activityCount: 5,
      rewardXp: 30,
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
