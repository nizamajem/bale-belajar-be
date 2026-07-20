import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  AssessmentStatus,
  AssignmentStatus,
  AttemptStatus,
  MasteryStatus,
  Prisma,
  RecommendationGeneratedBy,
} from "@prisma/client";
import { AuthenticatedUser } from "../../common/types/authenticated-user.type";
import { PrismaService } from "../../database/prisma/prisma.service";
import { MarkQuestionDto } from "./dto/mark-question.dto";
import { SaveAnswerDto } from "./dto/save-answer.dto";

const attemptWithAssessmentInclude = {
  answers: true,
  assignment: {
    include: {
      assessment: {
        include: {
          subject: { select: { id: true, code: true, name: true } },
          questions: {
            orderBy: { orderNumber: "asc" },
            include: {
              question: {
                include: {
                  competency: {
                    include: {
                      prerequisites: {
                        include: {
                          prerequisiteCompetency: true,
                        },
                      },
                    },
                  },
                  options: { orderBy: { orderNumber: "asc" } },
                },
              },
            },
          },
        },
      },
    },
  },
} satisfies Prisma.AssessmentAttemptInclude;

type AttemptWithAssessment = Prisma.AssessmentAttemptGetPayload<{
  include: typeof attemptWithAssessmentInclude;
}>;

type CompetencyScoreDraft = {
  competencyId: string;
  competencyName: string;
  prerequisiteIds: string[];
  totalWeight: number;
  correctWeight: number;
  score: number;
  masteryStatus: MasteryStatus;
};

@Injectable()
export class StudentAssessmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAssignments(currentUser: AuthenticatedUser) {
    const studentProfileId = this.getStudentProfileId(currentUser);

    return this.prisma.assessmentAssignment.findMany({
      where: {
        studentId: studentProfileId,
        assessment: {
          deletedAt: null,
          status: { in: [AssessmentStatus.ACTIVE, AssessmentStatus.SCHEDULED] },
        },
      },
      include: {
        assessment: {
          select: {
            id: true,
            title: true,
            description: true,
            gradeLevel: true,
            durationMinutes: true,
            startAt: true,
            endAt: true,
            status: true,
            subject: { select: { id: true, code: true, name: true } },
            _count: { select: { questions: true } },
          },
        },
        attempts: {
          select: { id: true, attemptNumber: true, status: true, startedAt: true, submittedAt: true },
          orderBy: { attemptNumber: "desc" },
          take: 1,
        },
      },
      orderBy: { assignedAt: "desc" },
    });
  }

  async findAssessment(currentUser: AuthenticatedUser, assessmentId: string) {
    const assignment = await this.getAssignmentForStudent(currentUser, assessmentId);

    return {
      id: assignment.assessment.id,
      title: assignment.assessment.title,
      description: assignment.assessment.description,
      gradeLevel: assignment.assessment.gradeLevel,
      durationMinutes: assignment.assessment.durationMinutes,
      startAt: assignment.assessment.startAt,
      endAt: assignment.assessment.endAt,
      status: assignment.assessment.status,
      subject: assignment.assessment.subject,
      assignment: {
        id: assignment.id,
        status: assignment.status,
        assignedAt: assignment.assignedAt,
        dueAt: assignment.dueAt,
      },
      questionCount: assignment.assessment._count.questions,
      latestAttempt: assignment.attempts[0] ?? null,
    };
  }

  async startAttempt(currentUser: AuthenticatedUser, assessmentId: string) {
    const assignment = await this.getAssignmentForStudent(currentUser, assessmentId);

    if (assignment.assessment.status !== AssessmentStatus.ACTIVE) {
      throw new BadRequestException("Asesmen belum aktif.");
    }

    const submittedAttempts = assignment.attempts.filter((attempt) =>
      attempt.status === AttemptStatus.SUBMITTED ||
      attempt.status === AttemptStatus.AUTO_SUBMITTED,
    );
    const inProgressAttempt = assignment.attempts.find(
      (attempt) => attempt.status === AttemptStatus.IN_PROGRESS,
    );

    if (inProgressAttempt) {
      return inProgressAttempt;
    }

    if (submittedAttempts.length >= assignment.assessment.maxAttempts) {
      throw new BadRequestException("Jumlah attempt sudah mencapai batas.");
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.assessmentAssignment.update({
        where: { id: assignment.id },
        data: { status: AssignmentStatus.STARTED },
      });

      return tx.assessmentAttempt.create({
        data: {
          assignmentId: assignment.id,
          attemptNumber: assignment.attempts.length + 1,
        },
      });
    });
  }

  async getAttempt(currentUser: AuthenticatedUser, attemptId: string) {
    const attempt = await this.getAttemptForStudent(currentUser, attemptId);
    const assessment = attempt.assignment.assessment;

    return {
      id: attempt.id,
      status: attempt.status,
      startedAt: attempt.startedAt,
      submittedAt: attempt.submittedAt,
      durationMinutes: assessment.durationMinutes,
      serverTime: new Date().toISOString(),
      assessment: {
        id: assessment.id,
        title: assessment.title,
        subject: assessment.subject,
      },
      answers: attempt.answers.map((answer) => ({
        id: answer.id,
        questionId: answer.questionId,
        selectedOptionId: answer.selectedOptionId,
        isMarkedForReview: answer.isMarkedForReview,
        answeredAt: answer.answeredAt,
      })),
      questions: assessment.questions.map((item) => ({
        id: item.question.id,
        code: item.question.code,
        orderNumber: item.orderNumber,
        competencyId: item.question.competencyId,
        subCompetencyId: item.question.subCompetencyId,
        gradeLevel: item.question.gradeLevel,
        difficulty: item.question.difficulty,
        type: item.question.type,
        questionText: item.question.questionText,
        imageUrl: item.question.imageUrl,
        options: item.question.options.map((option) => ({
          id: option.id,
          optionKey: option.optionKey,
          optionText: option.optionText,
          imageUrl: option.imageUrl,
          orderNumber: option.orderNumber,
        })),
      })),
    };
  }

  async saveAnswer(
    currentUser: AuthenticatedUser,
    attemptId: string,
    questionId: string,
    dto: SaveAnswerDto,
  ) {
    const attempt = await this.getAttemptForStudent(currentUser, attemptId);
    this.ensureAttemptInProgress(attempt.status);
    this.ensureQuestionInAttempt(attempt, questionId);

    if (dto.selectedOptionId) {
      this.ensureOptionInQuestion(attempt, questionId, dto.selectedOptionId);
    }

    return this.prisma.studentAnswer.upsert({
      where: {
        attemptId_questionId: {
          attemptId,
          questionId,
        },
      },
      update: {
        selectedOptionId: dto.selectedOptionId,
        isMarkedForReview: dto.isMarkedForReview,
        answeredAt: dto.selectedOptionId ? new Date() : undefined,
      },
      create: {
        attemptId,
        questionId,
        selectedOptionId: dto.selectedOptionId,
        isMarkedForReview: dto.isMarkedForReview ?? false,
        answeredAt: dto.selectedOptionId ? new Date() : undefined,
      },
    });
  }

  async markQuestion(
    currentUser: AuthenticatedUser,
    attemptId: string,
    questionId: string,
    dto: MarkQuestionDto,
  ) {
    const attempt = await this.getAttemptForStudent(currentUser, attemptId);
    this.ensureAttemptInProgress(attempt.status);
    this.ensureQuestionInAttempt(attempt, questionId);

    return this.prisma.studentAnswer.upsert({
      where: {
        attemptId_questionId: {
          attemptId,
          questionId,
        },
      },
      update: {
        isMarkedForReview: dto.isMarkedForReview,
      },
      create: {
        attemptId,
        questionId,
        isMarkedForReview: dto.isMarkedForReview,
      },
    });
  }

  async submitAttempt(currentUser: AuthenticatedUser, attemptId: string) {
    const attempt = await this.getAttemptForStudent(currentUser, attemptId);
    this.ensureAttemptInProgress(attempt.status);

    return this.prisma.$transaction(async (tx) => {
      const freshAttempt = await tx.assessmentAttempt.findFirst({
        where: {
          id: attemptId,
          assignment: {
            studentId: this.getStudentProfileId(currentUser),
          },
        },
        include: attemptWithAssessmentInclude,
      });

      if (!freshAttempt) {
        throw new NotFoundException("Attempt tidak ditemukan.");
      }

      this.ensureAttemptInProgress(freshAttempt.status);

      const answersByQuestionId = new Map(
        freshAttempt.answers.map((answer) => [answer.questionId, answer]),
      );
      let earnedWeight = 0;
      let totalWeight = 0;
      let correctAnswers = 0;
      let wrongAnswers = 0;
      let unanswered = 0;
      const competencyDrafts = new Map<string, CompetencyScoreDraft>();

      for (const assessmentQuestion of freshAttempt.assignment.assessment.questions) {
        const question = assessmentQuestion.question;
        const answer = answersByQuestionId.get(question.id);
        const selectedOption = question.options.find(
          (option) => option.id === answer?.selectedOptionId,
        );
        const isAnswered = Boolean(answer?.selectedOptionId);
        const isCorrect = selectedOption?.isCorrect ?? false;
        const weight = Number(assessmentQuestion.weightOverride ?? question.weight);

        totalWeight += weight;

        if (!isAnswered) {
          unanswered += 1;
        } else if (isCorrect) {
          correctAnswers += 1;
          earnedWeight += weight;
        } else {
          wrongAnswers += 1;
        }

        await tx.studentAnswer.upsert({
          where: {
            attemptId_questionId: {
              attemptId,
              questionId: question.id,
            },
          },
          update: {
            isCorrect,
            score: isCorrect ? weight : 0,
            answeredAt: answer?.answeredAt ?? (isAnswered ? new Date() : undefined),
          },
          create: {
            attemptId,
            questionId: question.id,
            selectedOptionId: answer?.selectedOptionId,
            isCorrect,
            score: isCorrect ? weight : 0,
            answeredAt: isAnswered ? new Date() : undefined,
          },
        });

        const draft = competencyDrafts.get(question.competencyId) ?? {
          competencyId: question.competencyId,
          competencyName: question.competency.name,
          prerequisiteIds: question.competency.prerequisites.map(
            (item) => item.prerequisiteCompetencyId,
          ),
          totalWeight: 0,
          correctWeight: 0,
          score: 0,
          masteryStatus: MasteryStatus.NEEDS_PRACTICE,
        };

        draft.totalWeight += weight;
        if (isCorrect) {
          draft.correctWeight += weight;
        }
        competencyDrafts.set(question.competencyId, draft);
      }

      const competencyResults = [...competencyDrafts.values()].map((draft) => {
        const score =
          draft.totalWeight > 0 ? (draft.correctWeight / draft.totalWeight) * 100 : 0;
        return {
          ...draft,
          score,
          masteryStatus: this.getMasteryStatus(score),
        };
      });

      await tx.competencyResult.deleteMany({ where: { attemptId } });
      for (const result of competencyResults) {
        await tx.competencyResult.create({
          data: {
            attemptId,
            competencyId: result.competencyId,
            totalQuestionWeight: result.totalWeight,
            correctWeight: result.correctWeight,
            score: result.score,
            masteryStatus: result.masteryStatus,
          },
        });
      }

      const recommendations = this.generateRecommendations(competencyResults);
      await tx.learningRecommendation.deleteMany({ where: { attemptId } });
      for (const [index, recommendation] of recommendations.entries()) {
        await tx.learningRecommendation.create({
          data: {
            attemptId,
            competencyId: recommendation.competencyId,
            priority: index + 1,
            title: recommendation.title,
            description: recommendation.description,
            recommendedDays: 7,
            generatedBy: RecommendationGeneratedBy.RULE_ENGINE,
            snapshotData: {
              score: recommendation.score,
              masteryStatus: recommendation.masteryStatus,
            },
          },
        });
      }

      const totalScore = totalWeight > 0 ? (earnedWeight / totalWeight) * 100 : 0;
      const submittedAt = new Date();
      const durationSeconds = Math.max(
        Math.floor((submittedAt.getTime() - freshAttempt.startedAt.getTime()) / 1000),
        0,
      );

      await tx.parentReport.deleteMany({ where: { attemptId } });
      await tx.parentReport.create({
        data: {
          attemptId,
          summary: this.createParentSummary(totalScore, recommendations.length),
        },
      });

      await tx.assessmentAssignment.update({
        where: { id: freshAttempt.assignmentId },
        data: { status: AssignmentStatus.COMPLETED },
      });

      return tx.assessmentAttempt.update({
        where: { id: attemptId },
        data: {
          submittedAt,
          durationSeconds,
          totalScore,
          correctAnswers,
          wrongAnswers,
          unanswered,
          status: AttemptStatus.SUBMITTED,
        },
        include: {
          competencyResults: {
            include: {
              competency: { select: { id: true, code: true, name: true } },
            },
          },
          recommendations: {
            orderBy: { priority: "asc" },
            include: {
              competency: { select: { id: true, code: true, name: true } },
            },
          },
          parentReports: true,
        },
      });
    });
  }

  async getResult(currentUser: AuthenticatedUser, attemptId: string) {
    await this.getAttemptForStudent(currentUser, attemptId);
    const result = await this.prisma.assessmentAttempt.findUnique({
      where: { id: attemptId },
      include: {
        assignment: {
          include: {
            assessment: {
              select: {
                id: true,
                title: true,
                showResultImmediately: true,
                subject: { select: { id: true, code: true, name: true } },
              },
            },
            student: {
              select: { id: true, fullName: true, participantCode: true },
            },
          },
        },
        competencyResults: {
          include: {
            competency: { select: { id: true, code: true, name: true } },
          },
          orderBy: { score: "asc" },
        },
        recommendations: {
          orderBy: { priority: "asc" },
          include: {
            competency: { select: { id: true, code: true, name: true } },
          },
        },
        parentReports: true,
      },
    });

    if (!result) {
      throw new NotFoundException("Hasil attempt tidak ditemukan.");
    }

    if (result.status === AttemptStatus.IN_PROGRESS) {
      throw new BadRequestException("Attempt belum disubmit.");
    }

    if (!result.assignment.assessment.showResultImmediately) {
      throw new ForbiddenException("Hasil belum dibuka oleh sekolah.");
    }

    return result;
  }

  async getReport(currentUser: AuthenticatedUser, attemptId: string) {
    const result = await this.getResult(currentUser, attemptId);
    return {
      attemptId,
      report: result.parentReports[0] ?? null,
      whatsappTemplate: this.createWhatsappTemplate(
        result.assignment.student.fullName,
        Number(result.totalScore ?? 0),
      ),
    };
  }

  private getStudentProfileId(currentUser: AuthenticatedUser) {
    if (!currentUser.studentProfileId) {
      throw new ForbiddenException("Akses hanya untuk siswa.");
    }

    return currentUser.studentProfileId;
  }

  private async getAssignmentForStudent(
    currentUser: AuthenticatedUser,
    assessmentId: string,
  ) {
    const studentProfileId = this.getStudentProfileId(currentUser);
    const assignment = await this.prisma.assessmentAssignment.findFirst({
      where: {
        assessmentId,
        studentId: studentProfileId,
      },
      include: {
        attempts: { orderBy: { attemptNumber: "asc" } },
        assessment: {
          include: {
            subject: { select: { id: true, code: true, name: true } },
            _count: { select: { questions: true } },
          },
        },
      },
    });

    if (!assignment) {
      throw new NotFoundException("Assignment asesmen tidak ditemukan.");
    }

    return assignment;
  }

  private async getAttemptForStudent(
    currentUser: AuthenticatedUser,
    attemptId: string,
  ) {
    const studentProfileId = this.getStudentProfileId(currentUser);
    const attempt = await this.prisma.assessmentAttempt.findFirst({
      where: {
        id: attemptId,
        assignment: { studentId: studentProfileId },
      },
      include: {
        ...attemptWithAssessmentInclude,
      },
    });

    if (!attempt) {
      throw new NotFoundException("Attempt tidak ditemukan.");
    }

    return attempt;
  }

  private ensureAttemptInProgress(status: AttemptStatus) {
    if (status !== AttemptStatus.IN_PROGRESS) {
      throw new BadRequestException("Attempt sudah tidak aktif.");
    }
  }

  private ensureQuestionInAttempt(
    attempt: AttemptWithAssessment,
    questionId: string,
  ) {
    const exists = attempt.assignment.assessment.questions.some(
      (item) => item.questionId === questionId,
    );

    if (!exists) {
      throw new BadRequestException("Soal tidak termasuk dalam attempt ini.");
    }
  }

  private ensureOptionInQuestion(
    attempt: AttemptWithAssessment,
    questionId: string,
    selectedOptionId: string,
  ) {
    const question = attempt.assignment.assessment.questions.find(
      (item) => item.questionId === questionId,
    );
    const exists = question?.question.options.some(
      (option) => option.id === selectedOptionId,
    );

    if (!exists) {
      throw new BadRequestException("Opsi jawaban tidak valid untuk soal ini.");
    }
  }

  private getMasteryStatus(score: number): MasteryStatus {
    if (score >= 80) {
      return MasteryStatus.MASTERED;
    }
    if (score >= 60) {
      return MasteryStatus.DEVELOPING;
    }
    return MasteryStatus.NEEDS_PRACTICE;
  }

  private generateRecommendations(results: CompetencyScoreDraft[]) {
    const resultsById = new Map(results.map((result) => [result.competencyId, result]));
    const prerequisiteRecommendations = results
      .flatMap((result) =>
        result.prerequisiteIds
          .map((prerequisiteId) => resultsById.get(prerequisiteId))
          .filter((item): item is CompetencyScoreDraft => Boolean(item))
          .filter((item) => item.score < 60),
      )
      .sort((a, b) => a.score - b.score);
    const directRecommendations = results
      .filter((result) => result.score < 60)
      .sort((a, b) => a.score - b.score);
    const unique = new Map<string, CompetencyScoreDraft>();

    for (const item of [...prerequisiteRecommendations, ...directRecommendations]) {
      if (!unique.has(item.competencyId)) {
        unique.set(item.competencyId, item);
      }
    }

    return [...unique.values()].slice(0, 3).map((result) => ({
      competencyId: result.competencyId,
      score: result.score,
      masteryStatus: result.masteryStatus,
      title: `Prioritas belajar: ${result.competencyName}`,
      description:
        result.score < 60
          ? `Latih kembali ${result.competencyName} dengan contoh bertahap dan soal pendek.`
          : `Pertahankan pemahaman ${result.competencyName} dengan latihan ringan.`,
    }));
  }

  private createParentSummary(totalScore: number, recommendationCount: number) {
    return `Skor asesmen siswa adalah ${Math.round(totalScore)}. Terdapat ${recommendationCount} prioritas belajar untuk tujuh hari ke depan. Hasil ini adalah asesmen diagnostik, bukan nilai rapor.`;
  }

  private createWhatsappTemplate(studentName: string, totalScore: number) {
    return `Ringkasan BaleBelajar untuk ${studentName}: skor diagnostik ${Math.round(totalScore)}. Silakan lihat prioritas belajar dan rencana latihan yang disarankan.`;
  }
}
