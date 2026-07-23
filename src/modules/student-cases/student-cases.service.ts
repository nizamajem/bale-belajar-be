import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { AssignmentStatus, AttemptStatus, Prisma, XpReason } from "@prisma/client";
import { AuthenticatedUser } from "../../common/types/authenticated-user.type";
import { PrismaService } from "../../database/prisma/prisma.service";
import { ExperienceLedgerService } from "../experience-ledger/experience-ledger.service";
import { MasteryService } from "../mastery/mastery.service";
import { SaveCaseAnswerDto } from "./dto/save-case-answer.dto";
import { SubmitCaseAttemptDto } from "./dto/submit-case-attempt.dto";
import {
  computeCaseXpReward,
  computeOverallScore,
  evaluateCaseAnswer,
} from "./case-evaluation.util";

const assignmentInclude = {
  caseMission: {
    include: {
      evidence: { orderBy: { orderNumber: "asc" as const } },
      questions: {
        orderBy: { orderNumber: "asc" as const },
        include: { competency: { select: { id: true, name: true } } },
      },
    },
  },
  attempt: {
    include: { answers: true },
  },
} satisfies Prisma.CaseAssignmentInclude;

type AssignmentWithCase = Prisma.CaseAssignmentGetPayload<{
  include: typeof assignmentInclude;
}>;

@Injectable()
export class StudentCasesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly experienceLedgerService: ExperienceLedgerService,
    private readonly masteryService: MasteryService,
  ) {}

  async getCurrentCase(currentUser: AuthenticatedUser, worldKey: string) {
    const studentProfileId = this.getStudentProfileId(currentUser);
    const world = await this.prisma.world.findUnique({ where: { key: worldKey } });

    if (!world || !world.isActive) {
      throw new NotFoundException("Dunia tidak ditemukan.");
    }

    const assignedDate = startOfDay(new Date());

    let assignment = await this.prisma.caseAssignment.findUnique({
      where: {
        studentProfileId_worldId_assignedDate: {
          studentProfileId,
          worldId: world.id,
          assignedDate,
        },
      },
      include: assignmentInclude,
    });

    if (!assignment) {
      const caseMission = await this.pickCaseForToday(world.id);

      assignment = await this.prisma.caseAssignment.create({
        data: {
          studentProfileId,
          worldId: world.id,
          caseMissionId: caseMission.id,
          assignedDate,
        },
        include: assignmentInclude,
      });
    }

    return this.serializeAssignment(assignment);
  }

  async startAttempt(currentUser: AuthenticatedUser, assignmentId: string) {
    const assignment = await this.getAssignmentForStudent(currentUser, assignmentId);

    if (assignment.attempt) {
      if (assignment.attempt.status !== AttemptStatus.IN_PROGRESS) {
        throw new BadRequestException("Kasus ini sudah diselesaikan.");
      }
      return assignment.attempt;
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.caseAssignment.update({
        where: { id: assignment.id },
        data: { status: AssignmentStatus.STARTED },
      });

      return tx.caseAttempt.create({
        data: { caseAssignmentId: assignment.id },
      });
    });
  }

  async saveAnswer(
    currentUser: AuthenticatedUser,
    attemptId: string,
    questionId: string,
    dto: SaveCaseAnswerDto,
  ) {
    const assignment = await this.getAssignmentForAttempt(currentUser, attemptId);
    this.ensureAttemptInProgress(assignment);
    this.ensureQuestionInCase(assignment, questionId);

    return this.prisma.caseAnswer.upsert({
      where: {
        caseAttemptId_caseQuestionId: { caseAttemptId: attemptId, caseQuestionId: questionId },
      },
      update: {
        answerText: dto.answerText,
        answeredAt: dto.answerText ? new Date() : undefined,
      },
      create: {
        caseAttemptId: attemptId,
        caseQuestionId: questionId,
        answerText: dto.answerText,
        answeredAt: dto.answerText ? new Date() : undefined,
      },
    });
  }

  async submitAttempt(
    currentUser: AuthenticatedUser,
    attemptId: string,
    dto: SubmitCaseAttemptDto,
  ) {
    const studentProfileId = this.getStudentProfileId(currentUser);
    const assignment = await this.getAssignmentForAttempt(currentUser, attemptId);
    this.ensureAttemptInProgress(assignment);

    return this.prisma.$transaction(async (tx) => {
      const freshAssignment = await tx.caseAssignment.findUnique({
        where: { id: assignment.id },
        include: assignmentInclude,
      });

      if (!freshAssignment?.attempt) {
        throw new NotFoundException("Attempt kasus tidak ditemukan.");
      }
      this.ensureAttemptInProgress(freshAssignment);

      const answersByQuestionId = new Map(
        freshAssignment.attempt.answers.map((answer) => [answer.caseQuestionId, answer]),
      );

      const evaluations = freshAssignment.caseMission.questions.map((question) =>
        evaluateCaseAnswer(
          { id: question.id, expectedKeywords: question.expectedKeywords },
          {
            questionId: question.id,
            answerText: answersByQuestionId.get(question.id)?.answerText ?? null,
          },
        ),
      );

      for (const evaluation of evaluations) {
        await tx.caseAnswer.upsert({
          where: {
            caseAttemptId_caseQuestionId: {
              caseAttemptId: attemptId,
              caseQuestionId: evaluation.questionId,
            },
          },
          update: { score: evaluation.score, matchedKeywords: evaluation.matchedKeywords },
          create: {
            caseAttemptId: attemptId,
            caseQuestionId: evaluation.questionId,
            answerText: answersByQuestionId.get(evaluation.questionId)?.answerText,
            score: evaluation.score,
            matchedKeywords: evaluation.matchedKeywords,
          },
        });

        const question = freshAssignment.caseMission.questions.find(
          (item) => item.id === evaluation.questionId,
        );
        if (question) {
          await this.masteryService.recordEvidence(tx, {
            studentProfileId,
            competencyId: question.competencyId,
            isCorrect: evaluation.score >= 60,
            sourceType: "CaseAnswer",
            sourceId: evaluation.questionId,
          });
        }
      }

      const overallScore = computeOverallScore(evaluations);
      const xpReward = computeCaseXpReward(evaluations);

      const xpResult = await this.experienceLedgerService.appendXp(tx, {
        studentProfileId,
        worldId: freshAssignment.worldId,
        amount: xpReward,
        reason: XpReason.MISSION_COMPLETED,
        sourceType: "CaseAttempt",
        sourceId: attemptId,
      });

      await this.experienceLedgerService.registerDailyActivity(tx, studentProfileId);

      await tx.caseAssignment.update({
        where: { id: freshAssignment.id },
        data: { status: AssignmentStatus.COMPLETED },
      });

      await tx.caseAttempt.update({
        where: { id: attemptId },
        data: {
          status: AttemptStatus.SUBMITTED,
          submittedAt: new Date(),
          conclusionText: dto.conclusionText,
          confidenceLevel: dto.confidenceLevel,
          overallScore,
        },
      });

      return {
        attemptId,
        overallScore,
        xpGained: xpReward,
        gameProfile: xpResult,
        questions: evaluations.map((evaluation) => {
          const question = freshAssignment.caseMission.questions.find(
            (item) => item.id === evaluation.questionId,
          );

          return {
            questionId: evaluation.questionId,
            prompt: question?.prompt,
            skill: question?.competency,
            answerText: answersByQuestionId.get(evaluation.questionId)?.answerText ?? null,
            score: evaluation.score,
            matchedKeywords: evaluation.matchedKeywords,
            missingKeywords: evaluation.missingKeywords,
            expectedReasoning: question?.expectedReasoning,
          };
        }),
      };
    });
  }

  async getResult(currentUser: AuthenticatedUser, attemptId: string) {
    const assignment = await this.getAssignmentForAttempt(currentUser, attemptId);

    if (!assignment.attempt || assignment.attempt.status !== AttemptStatus.SUBMITTED) {
      throw new BadRequestException("Kasus belum disubmit.");
    }

    const answersByQuestionId = new Map(
      assignment.attempt.answers.map((answer) => [answer.caseQuestionId, answer]),
    );

    return {
      attemptId,
      title: assignment.caseMission.title,
      overallScore: assignment.attempt.overallScore ? Number(assignment.attempt.overallScore) : 0,
      conclusionText: assignment.attempt.conclusionText,
      confidenceLevel: assignment.attempt.confidenceLevel,
      questions: assignment.caseMission.questions.map((question) => {
        const answer = answersByQuestionId.get(question.id);

        return {
          questionId: question.id,
          prompt: question.prompt,
          skill: question.competency,
          answerText: answer?.answerText ?? null,
          score: answer?.score ? Number(answer.score) : 0,
          matchedKeywords: answer?.matchedKeywords ?? [],
          expectedReasoning: question.expectedReasoning,
        };
      }),
    };
  }

  private async pickCaseForToday(worldId: string) {
    const activeCase = await this.prisma.caseMission.findFirst({
      where: { worldId, status: "ACTIVE" },
      orderBy: { createdAt: "asc" },
    });

    if (!activeCase) {
      throw new NotFoundException("Belum ada kasus aktif untuk dunia ini.");
    }

    return activeCase;
  }

  private serializeAssignment(assignment: AssignmentWithCase) {
    const isSubmitted = assignment.attempt?.status === AttemptStatus.SUBMITTED;
    const answersByQuestionId = new Map(
      (assignment.attempt?.answers ?? []).map((answer) => [answer.caseQuestionId, answer]),
    );

    return {
      assignmentId: assignment.id,
      worldId: assignment.worldId,
      status: assignment.status,
      case: {
        id: assignment.caseMission.id,
        title: assignment.caseMission.title,
        openingStory: assignment.caseMission.openingStory,
        estimatedMinutes: assignment.caseMission.estimatedMinutes,
      },
      attempt: assignment.attempt
        ? { id: assignment.attempt.id, status: assignment.attempt.status }
        : null,
      evidence: assignment.caseMission.evidence.map((item) => ({
        id: item.id,
        orderNumber: item.orderNumber,
        type: item.type,
        content: item.content,
        relevance: item.relevance,
        sourceStrength: item.sourceStrength,
      })),
      questions: assignment.caseMission.questions.map((question) => ({
        id: question.id,
        orderNumber: question.orderNumber,
        prompt: question.prompt,
        skill: question.competency,
        answerText: answersByQuestionId.get(question.id)?.answerText ?? null,
        // expectedKeywords/expectedReasoning sengaja tidak dikirim - itu kunci
        // jawaban dan hanya boleh terlihat setelah attempt disubmit.
        score: isSubmitted ? Number(answersByQuestionId.get(question.id)?.score ?? 0) : undefined,
      })),
    };
  }

  private getStudentProfileId(currentUser: AuthenticatedUser) {
    if (!currentUser.studentProfileId) {
      throw new ForbiddenException("Akses hanya untuk siswa.");
    }
    return currentUser.studentProfileId;
  }

  private async getAssignmentForStudent(currentUser: AuthenticatedUser, assignmentId: string) {
    const studentProfileId = this.getStudentProfileId(currentUser);
    const assignment = await this.prisma.caseAssignment.findFirst({
      where: { id: assignmentId, studentProfileId },
      include: assignmentInclude,
    });

    if (!assignment) {
      throw new NotFoundException("Kasus tidak ditemukan.");
    }
    return assignment;
  }

  private async getAssignmentForAttempt(currentUser: AuthenticatedUser, attemptId: string) {
    const studentProfileId = this.getStudentProfileId(currentUser);
    const assignment = await this.prisma.caseAssignment.findFirst({
      where: { studentProfileId, attempt: { id: attemptId } },
      include: assignmentInclude,
    });

    if (!assignment) {
      throw new NotFoundException("Attempt kasus tidak ditemukan.");
    }
    return assignment;
  }

  private ensureAttemptInProgress(assignment: AssignmentWithCase) {
    if (!assignment.attempt || assignment.attempt.status !== AttemptStatus.IN_PROGRESS) {
      throw new BadRequestException("Attempt kasus sudah tidak aktif.");
    }
  }

  private ensureQuestionInCase(assignment: AssignmentWithCase, questionId: string) {
    const exists = assignment.caseMission.questions.some((question) => question.id === questionId);
    if (!exists) {
      throw new BadRequestException("Pertanyaan tidak termasuk dalam kasus ini.");
    }
  }
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}
