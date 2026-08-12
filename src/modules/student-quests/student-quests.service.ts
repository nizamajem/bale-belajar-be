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
import { SaveQuestAnswerDto } from "./dto/save-quest-answer.dto";
import {
  QuestAnswerEvaluationResult,
  QuestAnswerPayload,
  QuestQuestionForEvaluation,
  QuestQuestionTypeValue,
  evaluateQuestAnswer,
} from "./quest-evaluation.util";

const questionInclude = {
  competency: { select: { id: true, name: true } },
  options: { orderBy: { displayOrder: "asc" as const } },
  matchingPairs: { orderBy: { pairOrder: "asc" as const } },
  orderItems: { orderBy: { displayOrder: "asc" as const } },
  acceptedAnswers: true,
  rubricCriteria: true,
  media: true,
  hotspotAreas: true,
  evidenceItems: { orderBy: { displayOrder: "asc" as const } },
  codeConfig: true,
} satisfies Prisma.QuestQuestionInclude;

const assignmentInclude = {
  quest: {
    include: {
      chapter: { select: { id: true, title: true, story: true } },
      questions: {
        where: { status: "ACTIVE" as const },
        orderBy: { orderNumber: "asc" as const },
        include: questionInclude,
      },
    },
  },
  attempt: { include: { answers: true } },
} satisfies Prisma.QuestAssignmentInclude;

type AssignmentWithQuest = Prisma.QuestAssignmentGetPayload<{ include: typeof assignmentInclude }>;
type QuestQuestionWithChildren = Prisma.QuestQuestionGetPayload<{ include: typeof questionInclude }>;

const MIN_ACTIVE_QUEST_QUESTIONS = 10;

@Injectable()
export class StudentQuestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly experienceLedgerService: ExperienceLedgerService,
    private readonly masteryService: MasteryService,
  ) {}

  async getTodayQuest(currentUser: AuthenticatedUser, worldKey: string) {
    const studentProfileId = this.getStudentProfileId(currentUser);
    const world = await this.prisma.world.findUnique({ where: { key: worldKey } });

    if (!world || !world.isActive) {
      throw new NotFoundException("Dunia tidak ditemukan.");
    }

    const assignedDate = startOfDay(new Date());

    let assignment = await this.prisma.questAssignment.findUnique({
      where: {
        studentProfileId_worldId_assignedDate: {
          studentProfileId,
          worldId: world.id,
          assignedDate,
        },
      },
      include: assignmentInclude,
    });

    if (
      assignment &&
      assignment.quest.questions.length < MIN_ACTIVE_QUEST_QUESTIONS &&
      assignment.attempt?.status !== AttemptStatus.SUBMITTED
    ) {
      const replacementQuest = await this.pickQuestForToday(world.id, assignment.questId);
      if (replacementQuest.id !== assignment.questId) {
        await this.prisma.$transaction(async (tx) => {
          if (assignment?.attempt) {
            await tx.questAnswer.deleteMany({ where: { questAttemptId: assignment.attempt.id } });
            await tx.questAttempt.delete({ where: { id: assignment.attempt.id } });
          }
          await tx.questAssignment.update({
            where: { id: assignment!.id },
            data: {
              questId: replacementQuest.id,
              status: AssignmentStatus.ASSIGNED,
            },
          });
        });
        assignment = await this.prisma.questAssignment.findUnique({
          where: {
            studentProfileId_worldId_assignedDate: {
              studentProfileId,
              worldId: world.id,
              assignedDate,
            },
          },
          include: assignmentInclude,
        });
      }
    }

    if (!assignment) {
      const quest = await this.pickQuestForToday(world.id);

      assignment = await this.prisma.questAssignment.create({
        data: {
          studentProfileId,
          worldId: world.id,
          questId: quest.id,
          assignedDate,
        },
        include: assignmentInclude,
      });
    }

    if (assignment.quest.questions.length === 0) {
      throw new NotFoundException("Misi ini belum punya pertanyaan aktif.");
    }
    if (assignment.quest.questions.length < MIN_ACTIVE_QUEST_QUESTIONS) {
      throw new NotFoundException(
        `Misi hari ini baru punya ${assignment.quest.questions.length} pertanyaan aktif. Minimal ${MIN_ACTIVE_QUEST_QUESTIONS} pertanyaan.`,
      );
    }

    return this.serializeAssignment(assignment);
  }

  async startAttempt(currentUser: AuthenticatedUser, assignmentId: string) {
    const assignment = await this.getAssignmentForStudent(currentUser, assignmentId);

    if (assignment.attempt) {
      if (assignment.attempt.status !== AttemptStatus.IN_PROGRESS) {
        throw new BadRequestException("Quest ini sudah diselesaikan.");
      }
      return assignment.attempt;
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.questAssignment.update({
        where: { id: assignment.id },
        data: { status: AssignmentStatus.STARTED },
      });

      return tx.questAttempt.create({
        data: { questAssignmentId: assignment.id },
      });
    });
  }

  async saveAnswer(
    currentUser: AuthenticatedUser,
    attemptId: string,
    questionId: string,
    dto: SaveQuestAnswerDto,
  ) {
    const assignment = await this.getAssignmentForAttempt(currentUser, attemptId);
    this.ensureAttemptInProgress(assignment);
    this.ensureQuestionInQuest(assignment, questionId);

    const payload = (dto.payload ?? {}) as Prisma.InputJsonValue;

    return this.prisma.questAnswer.upsert({
      where: {
        questAttemptId_questQuestionId: { questAttemptId: attemptId, questQuestionId: questionId },
      },
      update: { payload, answeredAt: new Date() },
      create: {
        questAttemptId: attemptId,
        questQuestionId: questionId,
        payload,
        answeredAt: new Date(),
      },
    });
  }

  async submitAttempt(currentUser: AuthenticatedUser, attemptId: string) {
    const studentProfileId = this.getStudentProfileId(currentUser);
    const assignment = await this.getAssignmentForAttempt(currentUser, attemptId);
    this.ensureAttemptInProgress(assignment);

    return this.prisma.$transaction(async (tx) => {
      const freshAssignment = await tx.questAssignment.findUnique({
        where: { id: assignment.id },
        include: assignmentInclude,
      });

      if (!freshAssignment?.attempt) {
        throw new NotFoundException("Attempt quest tidak ditemukan.");
      }
      this.ensureAttemptInProgress(freshAssignment);

      const answersByQuestionId = new Map(
        freshAssignment.attempt.answers.map((answer) => [answer.questQuestionId, answer]),
      );

      const evaluations: QuestAnswerEvaluationResult[] = [];

      for (const question of freshAssignment.quest.questions) {
        const existingAnswer = answersByQuestionId.get(question.id);
        const payload = (existingAnswer?.payload ?? null) as QuestAnswerPayload | null;
        const evaluation = evaluateQuestAnswer(toEvaluationQuestion(question), payload);
        evaluations.push(evaluation);

        await tx.questAnswer.upsert({
          where: {
            questAttemptId_questQuestionId: { questAttemptId: attemptId, questQuestionId: question.id },
          },
          update: {
            score: evaluation.score,
            isCorrect: evaluation.isCorrect,
            evaluationStatus: evaluation.evaluationStatus,
            evaluatorDetail: evaluation.detail as Prisma.InputJsonValue,
          },
          create: {
            questAttemptId: attemptId,
            questQuestionId: question.id,
            payload: (existingAnswer?.payload ?? Prisma.JsonNull) as Prisma.InputJsonValue,
            score: evaluation.score,
            isCorrect: evaluation.isCorrect,
            evaluationStatus: evaluation.evaluationStatus,
            evaluatorDetail: evaluation.detail as Prisma.InputJsonValue,
          },
        });

        // Mastery evidence HANYA dicatat untuk soal yang benar-benar
        // AUTO_SCORED - soal MENTOR_REVIEW_NEEDED belum punya bukti valid
        // sampai direview manusia (prinsip #3 CLAUDE.md).
        if (evaluation.evaluationStatus === "AUTO_SCORED" && evaluation.isCorrect !== null) {
          await this.masteryService.recordEvidence(tx, {
            studentProfileId,
            competencyId: question.competencyId,
            isCorrect: evaluation.isCorrect,
            sourceType: "QuestAnswer",
            sourceId: question.id,
          });
        }
      }

      const scoredEvaluations = evaluations.filter((e): e is QuestAnswerEvaluationResult & { score: number } => e.score !== null);
      const overallScore =
        scoredEvaluations.length === 0
          ? 0
          : Math.round(scoredEvaluations.reduce((sum, e) => sum + e.score, 0) / scoredEvaluations.length);
      const xpReward = freshAssignment.quest.xpRewardFirst;

      const xpResult = await this.experienceLedgerService.appendXp(tx, {
        studentProfileId,
        worldId: freshAssignment.worldId,
        amount: xpReward,
        reason: XpReason.MISSION_COMPLETED,
        sourceType: "QuestAttempt",
        sourceId: attemptId,
      });

      await this.experienceLedgerService.registerDailyActivity(tx, studentProfileId);

      await tx.questAssignment.update({
        where: { id: freshAssignment.id },
        data: { status: AssignmentStatus.COMPLETED },
      });

      await tx.questAttempt.update({
        where: { id: attemptId },
        data: {
          status: AttemptStatus.SUBMITTED,
          submittedAt: new Date(),
          overallScore,
        },
      });

      return {
        attemptId,
        overallScore,
        xpGained: xpReward,
        gameProfile: xpResult,
        questions: evaluations.map((evaluation) => {
          const question = freshAssignment.quest.questions.find((item) => item.id === evaluation.questionId);
          return question ? this.serializeQuestionResult(question, evaluation) : null;
        }),
      };
    });
  }

  async getResult(currentUser: AuthenticatedUser, attemptId: string) {
    const assignment = await this.getAssignmentForAttempt(currentUser, attemptId);

    if (!assignment.attempt || assignment.attempt.status !== AttemptStatus.SUBMITTED) {
      throw new BadRequestException("Quest belum disubmit.");
    }

    const answersByQuestionId = new Map(
      assignment.attempt.answers.map((answer) => [answer.questQuestionId, answer]),
    );

    return {
      attemptId,
      title: assignment.quest.title,
      overallScore: assignment.attempt.overallScore ? Number(assignment.attempt.overallScore) : 0,
      questions: assignment.quest.questions.map((question) => {
        const answer = answersByQuestionId.get(question.id);
        const evaluation: QuestAnswerEvaluationResult = {
          questionId: question.id,
          score: answer?.score ? Number(answer.score) : null,
          isCorrect: answer?.isCorrect ?? null,
          evaluationStatus: (answer?.evaluationStatus ?? "MENTOR_REVIEW_NEEDED") as "AUTO_SCORED" | "MENTOR_REVIEW_NEEDED",
          detail: (answer?.evaluatorDetail as Record<string, unknown>) ?? {},
        };
        return this.serializeQuestionResult(question, evaluation, answer?.payload ?? null);
      }),
    };
  }

  private async pickQuestForToday(worldId: string, excludeQuestId?: string) {
    const activeQuests = await this.prisma.quest.findMany({
      where: {
        worldId,
        status: "ACTIVE",
        ...(excludeQuestId ? { id: { not: excludeQuestId } } : {}),
        questions: { some: { status: "ACTIVE" } },
      },
      orderBy: { createdAt: "asc" },
      include: {
        _count: { select: { questions: { where: { status: "ACTIVE" } } } },
      },
    });

    const readyQuests = activeQuests.filter(
      (quest) => quest._count.questions >= MIN_ACTIVE_QUEST_QUESTIONS,
    );
    if (readyQuests.length === 0) {
      throw new NotFoundException(
        `Belum ada quest aktif dengan minimal ${MIN_ACTIVE_QUEST_QUESTIONS} pertanyaan untuk dunia ini.`,
      );
    }

    const dayIndex = Math.floor(Date.now() / 86_400_000);
    return readyQuests[dayIndex % readyQuests.length];
  }

  private serializeAssignment(assignment: AssignmentWithQuest) {
    const isSubmitted = assignment.attempt?.status === AttemptStatus.SUBMITTED;
    const answersByQuestionId = new Map(
      (assignment.attempt?.answers ?? []).map((answer) => [answer.questQuestionId, answer]),
    );

    return {
      assignmentId: assignment.id,
      worldId: assignment.worldId,
      status: assignment.status,
      quest: {
        id: assignment.quest.id,
        title: assignment.quest.title,
        story: assignment.quest.story,
        objective: assignment.quest.objective,
        studentInstruction: assignment.quest.studentInstruction,
        estimatedMinutes: assignment.quest.estimatedMinutes,
        rewardXp: assignment.quest.xpRewardFirst,
        hints: assignment.quest.hints,
        chapter: assignment.quest.chapter
          ? { id: assignment.quest.chapter.id, title: assignment.quest.chapter.title }
          : null,
      },
      attempt: assignment.attempt
        ? { id: assignment.attempt.id, status: assignment.attempt.status }
        : null,
      // Kunci jawaban (isCorrect/misconception/correctPosition/dst) sengaja
      // TIDAK dikirim di sini - baru terlihat lewat getResult() setelah
      // attempt SUBMITTED. Lihat serializeQuestionForAttempt().
      questions: assignment.quest.questions.map((question) =>
        this.serializeQuestionForAttempt(
          question,
          answersByQuestionId.get(question.id)?.payload ?? null,
          isSubmitted,
        ),
      ),
    };
  }

  /** Tampilan soal SEBELUM/SELAMA attempt - kunci jawaban wajib disembunyikan. */
  private serializeQuestionForAttempt(
    question: QuestQuestionWithChildren,
    savedPayload: Prisma.JsonValue | null,
    revealKey: boolean,
  ) {
    const base = {
      id: question.id,
      orderNumber: question.orderNumber,
      questionType: question.questionType,
      skill: question.competency,
      measurementCategory: question.measurementCategory,
      difficulty: question.difficulty,
      questionText: question.questionText,
      stimulusText: question.stimulusText,
      instruction: question.instruction,
      inputMode: question.inputMode,
      maxLength: question.maxLength,
      media: question.media.map((m) => ({
        mediaType: m.mediaType,
        url: m.url,
        durationSeconds: m.durationSeconds,
        maxReplay: m.maxReplay,
        transcriptAvailable: m.transcriptAvailable,
        transcript: m.transcript,
        altText: m.altText,
      })),
      savedAnswer: savedPayload,
    };

    if (revealKey) {
      return { ...base, ...this.answerKeyFields(question) };
    }

    switch (question.questionType) {
      case "SINGLE_CHOICE":
      case "MULTIPLE_SELECT":
      case "BINARY_CHOICE":
      case "IMAGE_CHOICE":
      case "AUDIO_CHOICE":
        return {
          ...base,
          options: question.options.map((o) => ({
            id: o.optionId,
            label: o.label,
            description: o.description,
            imageUrl: o.imageUrl,
          })),
        };
      case "SHORT_TEXT":
        return base;
      case "MATCHING":
        return {
          ...base,
          matchingLeftOptions: question.matchingPairs.map((p) => ({ id: p.leftId, label: p.leftLabel })),
          // Kolom kanan sengaja diurutkan beda dari pairOrder (bukan
          // urutan leftOptions) supaya posisi array tidak membocorkan
          // pasangan yang benar.
          matchingRightOptions: [...question.matchingPairs]
            .sort((a, b) => a.rightId.localeCompare(b.rightId))
            .map((p) => ({ id: p.rightId, label: p.rightLabel })),
        };
      case "ORDERING":
      case "TIMELINE_BUILDER":
        return {
          ...base,
          items: question.orderItems.map((i) => ({
            id: i.itemId,
            label: this.orderItemLabel(i, question.options),
            timeLabel: i.timeLabel,
            description: i.description,
          })),
        };
      case "IMAGE_HOTSPOT":
        return {
          ...base,
          hotspotAreas: question.hotspotAreas.map((h) => ({
            id: h.hotspotId,
            label: h.label,
            x: Number(h.xRelative),
            y: Number(h.yRelative),
            radius: Number(h.radiusRelative),
          })),
        };
      case "EVIDENCE_BOARD":
        return {
          ...base,
          evidenceItems: question.evidenceItems.map((e) => ({
            id: e.evidenceId,
            label: e.label,
            description: e.description,
            category: e.category,
          })),
        };
      case "CODE_INPUT":
        return {
          ...base,
          codeConfig: question.codeConfig
            ? {
                language: question.codeConfig.language,
                initialCode: question.codeConfig.initialCode,
                readOnlyPrefix: question.codeConfig.readOnlyPrefix,
              }
            : null,
        };
      case "LONG_TEXT":
      case "VOICE_RESPONSE":
        return base;
      default:
        return base;
    }
  }

  /** Field kunci jawaban lengkap - hanya boleh dipanggil setelah SUBMITTED. */
  private answerKeyFields(question: QuestQuestionWithChildren) {
    return {
      options: question.options.map((o) => ({
        id: o.optionId,
        label: o.label,
        isCorrect: o.isCorrect,
        misconception: o.misconception,
      })),
      matchingPairs: question.matchingPairs.map((p) => ({
        leftId: p.leftId,
        leftLabel: p.leftLabel,
        rightId: p.rightId,
        rightLabel: p.rightLabel,
      })),
      correctOrder: [...question.orderItems]
        .sort((a, b) => a.correctPosition - b.correctPosition)
        .map((i) => ({ id: i.itemId, label: this.orderItemLabel(i, question.options) })),
      acceptedAnswers: question.acceptedAnswers.map((a) => a.answerText),
      hotspotAreas: question.hotspotAreas.map((h) => ({ id: h.hotspotId, label: h.label, isCorrect: h.isCorrect })),
      evidenceItems: question.evidenceItems.map((e) => ({
        id: e.evidenceId,
        label: e.label,
        isCorrectEvidence: e.isCorrectEvidence,
        misconception: e.misconception,
      })),
      sampleAnswer: question.sampleAnswer,
      rubricCriteria: question.rubricCriteria.map((r) => ({
        criterion: r.criterion,
        criterionDescription: r.criterionDescription,
        weightPct: Number(r.weightPct),
        scoreDescriptions: r.scoreDescriptions,
      })),
      codeConfig: question.codeConfig
        ? { expectedOutput: question.codeConfig.expectedOutput }
        : null,
    };
  }

  /** Hasil per-soal setelah submit - selalu tampilkan kunci jawaban. */
  private serializeQuestionResult(
    question: QuestQuestionWithChildren,
    evaluation: QuestAnswerEvaluationResult,
    savedPayload: Prisma.JsonValue | null = null,
  ) {
    return {
      ...this.serializeQuestionForAttempt(question, savedPayload, true),
      score: evaluation.score,
      isCorrect: evaluation.isCorrect,
      // MENTOR_REVIEW_NEEDED = belum ada skor sungguhan, jangan tampilkan
      // seolah sudah dinilai - frontend wajib menampilkan status "menunggu
      // review", bukan angka skor palsu.
      evaluationStatus: evaluation.evaluationStatus,
    };
  }

  private getStudentProfileId(currentUser: AuthenticatedUser) {
    if (!currentUser.studentProfileId) {
      throw new ForbiddenException("Akses hanya untuk siswa.");
    }
    return currentUser.studentProfileId;
  }

  private orderItemLabel(
    item: QuestQuestionWithChildren["orderItems"][number],
    options: QuestQuestionWithChildren["options"],
  ) {
    const direct = item.label?.trim() || item.description?.trim();
    if (direct) return direct;

    const optionId = item.itemId.includes("_")
      ? item.itemId.split("_").at(-1)
      : item.itemId;
    const linkedOption = options.find(
      (option) => option.optionId === optionId || option.optionId === item.itemId,
    );
    return linkedOption?.label?.trim() || item.itemId;
  }

  private async getAssignmentForStudent(currentUser: AuthenticatedUser, assignmentId: string) {
    const studentProfileId = this.getStudentProfileId(currentUser);
    const assignment = await this.prisma.questAssignment.findFirst({
      where: { id: assignmentId, studentProfileId },
      include: assignmentInclude,
    });

    if (!assignment) {
      throw new NotFoundException("Quest tidak ditemukan.");
    }
    return assignment;
  }

  private async getAssignmentForAttempt(currentUser: AuthenticatedUser, attemptId: string) {
    const studentProfileId = this.getStudentProfileId(currentUser);
    const assignment = await this.prisma.questAssignment.findFirst({
      where: { studentProfileId, attempt: { id: attemptId } },
      include: assignmentInclude,
    });

    if (!assignment) {
      throw new NotFoundException("Attempt quest tidak ditemukan.");
    }
    return assignment;
  }

  private ensureAttemptInProgress(assignment: AssignmentWithQuest) {
    if (!assignment.attempt || assignment.attempt.status !== AttemptStatus.IN_PROGRESS) {
      throw new BadRequestException("Attempt quest sudah tidak aktif.");
    }
  }

  private ensureQuestionInQuest(assignment: AssignmentWithQuest, questionId: string) {
    const exists = assignment.quest.questions.some((question) => question.id === questionId);
    if (!exists) {
      throw new BadRequestException("Pertanyaan tidak termasuk dalam quest ini.");
    }
  }
}

function toEvaluationQuestion(question: QuestQuestionWithChildren): QuestQuestionForEvaluation {
  return {
    id: question.id,
    questionType: question.questionType as QuestQuestionTypeValue,
    scoringConfig: question.scoringConfig,
    caseSensitive: question.caseSensitive,
    inputMode: question.inputMode,
    options: question.options.map((o) => ({ optionId: o.optionId, isCorrect: o.isCorrect })),
    matchingPairs: question.matchingPairs.map((p) => ({ leftId: p.leftId, rightId: p.rightId })),
    orderItems: question.orderItems.map((i) => ({ itemId: i.itemId, correctPosition: i.correctPosition })),
    acceptedAnswers: question.acceptedAnswers.map((a) => ({
      answerText: a.answerText,
      normalizedAnswer: a.normalizedAnswer,
      toleranceNumeric: a.toleranceNumeric === null ? null : Number(a.toleranceNumeric),
    })),
    hotspotAreas: question.hotspotAreas.map((h) => ({ hotspotId: h.hotspotId, isCorrect: h.isCorrect })),
    evidenceItems: question.evidenceItems.map((e) => ({
      evidenceId: e.evidenceId,
      isCorrectEvidence: e.isCorrectEvidence,
    })),
  };
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}
