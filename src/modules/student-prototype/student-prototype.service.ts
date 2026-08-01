import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../database/prisma/prisma.service";
import { SaveOnboardingDto } from "../student-onboarding/dto/save-onboarding.dto";
import { SavePlacementAnswerDto } from "../student-placement/dto/save-placement-answer.dto";

const TOTAL_PLACEMENT_QUESTIONS = 13;

@Injectable()
export class StudentPrototypeService {
  constructor(private readonly prisma: PrismaService) {}

  async startSession() {
    const student = await this.prisma.studentProfile.create({
      data: {
        fullName: "Nara",
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
    const attempt = await this.prisma.placementAttempt.create({
      data: {
        studentProfileId,
        worldKey,
        totalQuestions: TOTAL_PLACEMENT_QUESTIONS,
      },
    });

    return { attemptId: attempt.id, totalQuestions: TOTAL_PLACEMENT_QUESTIONS };
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

    const answered = attempt.answers.filter((answer) => !answer.isSkipped);
    const skipped = attempt.answers.length - answered.length;
    const completionRatio = answered.length / TOTAL_PLACEMENT_QUESTIONS;
    const selectedWorld = attempt.worldKey ?? "DETECTIVIA";
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
        firstMission: this.firstMission(selectedWorld),
        scoreSummary: {
          answered: answered.length,
          skipped,
          totalQuestions: TOTAL_PLACEMENT_QUESTIONS,
          completionRatio,
        },
      },
      update: {
        status: "READY",
        recommendedLevel,
        selectedWorld,
        strengths: ["PATTERN_RECOGNITION", "IMAGE_REASONING", "ORDERING"],
        focusAreas: ["EXPLAIN_REASONING", "VERIFY_INFORMATION", "STEP_BY_STEP"],
        firstMission: this.firstMission(selectedWorld),
        scoreSummary: {
          answered: answered.length,
          skipped,
          totalQuestions: TOTAL_PLACEMENT_QUESTIONS,
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

  private firstMission(worldKey: string) {
    return {
      id: `first-${worldKey.toLowerCase()}`,
      title:
        worldKey === "KODEX"
          ? "Gerbang Distribusi"
          : worldKey === "NUMERIA"
            ? "Pola Angka Pertama"
            : "Misteri Jadwal yang Berubah",
      durationMinutes: 8,
      activityCount: 5,
      rewardXp: 30,
    };
  }

  private async assertStudent(studentProfileId: string) {
    const student = await this.prisma.studentProfile.findUnique({
      where: { id: studentProfileId },
    });
    if (!student) throw new NotFoundException("Sesi siswa tidak ditemukan.");
  }

  private async assertAttempt(attemptId: string) {
    const attempt = await this.prisma.placementAttempt.findUnique({
      where: { id: attemptId },
    });
    if (!attempt) throw new NotFoundException("Attempt tidak ditemukan.");
  }
}
