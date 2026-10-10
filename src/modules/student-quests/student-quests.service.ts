import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { AssignmentStatus, AttemptStatus, MissionStatus, Prisma, XpReason } from "@prisma/client";
import { AuthenticatedUser } from "../../common/types/authenticated-user.type";
import { PrismaService } from "../../database/prisma/prisma.service";
import { ExperienceLedgerService } from "../experience-ledger/experience-ledger.service";
import { MasteryService } from "../mastery/mastery.service";
import { SaveQuestAnswerDto } from "./dto/save-quest-answer.dto";
import { UpdateQuestSettingDto } from "./dto/update-quest-setting.dto";
import { availableKoreanQuests, optionalKoreanQuest } from './korean-progression.util';
import { ReviewKoreanWritingDto } from './dto/review-korean-writing.dto';
import { koreanExamDeadline, koreanMockMode, summarizeKoreanExam } from './korean-exam.util';
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
// Skor minimal agar quest dianggap lulus dan siswa naik ke quest/chapter
// berikutnya (lihat pickQuestForToday).
const QUEST_PASS_SCORE = 60;

@Injectable()
export class StudentQuestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly experienceLedgerService: ExperienceLedgerService,
    private readonly masteryService: MasteryService,
  ) {}

  async listKoreanWritingReviews() {
    return this.prisma.questAnswer.findMany({ where: {
      evaluationStatus: 'MENTOR_REVIEW_NEEDED', question: { questionType: 'LONG_TEXT', quest: { world: { key: { in: ['korean-learning', 'korean-topik-pbt', 'korean-topik-ibt'] } } } },
      attempt: { status: AttemptStatus.SUBMITTED },
    }, take: 100, orderBy: { createdAt: 'asc' }, include: {
      question: { select: { questionText: true, instruction: true, rubricCriteria: true } },
      attempt: { select: { questAssignmentId: true } },
    } });
  }

  async reviewKoreanWriting(user: AuthenticatedUser, answerId: string, dto: ReviewKoreanWritingDto) {
    return this.prisma.$transaction(async tx => {
      const answer = await tx.questAnswer.findUnique({ where: { id: answerId }, include: {
        question: { include: { rubricCriteria: true, quest: { include: { world: true, questions: { where: { status: 'ACTIVE' }, select: { id: true, scoringConfig: true } } } } } },
        attempt: { include: { assignment: { include: { quest: true } } } },
      } });
      if (!answer || answer.question.questionType !== 'LONG_TEXT' || !['korean-learning', 'korean-topik-pbt', 'korean-topik-ibt'].includes(answer.question.quest.world.key)) throw new NotFoundException('Jawaban writing Korea tidak ditemukan.');
      if (answer.attempt.status !== AttemptStatus.SUBMITTED || answer.evaluationStatus !== 'MENTOR_REVIEW_NEEDED') throw new BadRequestException('Jawaban belum disubmit atau sudah direview.');
      const rubric = answer.question.rubricCriteria;
      const scores = new Map(dto.criteria.map(item => [item.criterionId, item.score]));
      if (!dto.feedback.trim() || scores.size !== rubric.length || scores.size !== dto.criteria.length || rubric.some(item => !scores.has(item.criterionId))) throw new BadRequestException('Feedback dan nilai semua kriteria rubrik wajib diisi tepat satu kali.');
      const score = Math.round(rubric.reduce((sum, criterion) => sum + scores.get(criterion.criterionId)! * Number(criterion.weightPct) / 100, 0));
      const updated = await tx.questAnswer.updateMany({ where: { id: answer.id, evaluationStatus: 'MENTOR_REVIEW_NEEDED' }, data: {
        score, isCorrect: score >= 75, evaluationStatus: 'VALIDATED',
        evaluatorDetail: { reviewerId: user.id, reviewedAt: new Date().toISOString(), feedback: dto.feedback, criteria: dto.criteria.map(c => ({ criterionId: c.criterionId, score: c.score })) },
      } });
      if (updated.count !== 1) throw new BadRequestException('Jawaban sudah direview.');
      await this.masteryService.recordEvidence(tx, { studentProfileId: answer.attempt.assignment.studentProfileId,
        competencyId: answer.question.competencyId, isCorrect: score >= 75, sourceType: 'QuestAnswer', sourceId: answer.id });
      const answers = await tx.questAnswer.findMany({ where: { questAttemptId: answer.questAttemptId }, include: { question: { select: { questionType: true } } } });
      const pending = answers.some(item => item.score === null);
      const writingPassed = answers.filter(item => item.question.questionType === 'LONG_TEXT').every(item => Number(item.score ?? 0) >= 75);
      const exam = summarizeKoreanExam(answer.question.quest.missionType, answer.question.quest.questions, answers.map(item => ({ questionId: item.questQuestionId, score: item.score === null ? null : Number(item.score) })));
      const overallScore = exam ? exam.overallScore : pending ? null : Math.round(answers.reduce((sum, item) => sum + Number(item.score), 0) / answers.length);
      await tx.questAttempt.update({ where: { id: answer.questAttemptId }, data: { overallScore } });
      let xpGained = 0;
      if (overallScore !== null && overallScore >= 75 && writingPassed) {
        const assignment = answer.attempt.assignment;
        const previousPasses = await tx.questAssignment.count({ where: { studentProfileId: assignment.studentProfileId, questId: assignment.questId,
          id: { not: assignment.id }, attempt: { status: AttemptStatus.SUBMITTED, overallScore: { gte: 75 },
            answers: { none: { OR: [{ evaluationStatus: 'MENTOR_REVIEW_NEEDED' }, { question: { questionType: 'LONG_TEXT' }, score: { lt: 75 } }] } } } } });
        xpGained = Math.round(assignment.quest.xpRewardFirst * (previousPasses === 0 ? 1 : previousPasses === 1 ? Number(assignment.quest.xpMultiplierSecond) : Number(assignment.quest.xpMultiplierThirdPlus)));
        await this.experienceLedgerService.appendXp(tx, { studentProfileId: assignment.studentProfileId, worldId: assignment.worldId,
          amount: xpGained, reason: XpReason.MISSION_COMPLETED, sourceType: 'QuestAttempt', sourceId: answer.questAttemptId });
      }
      return { answerId, score, overallScore, exam, reviewPending: pending, passed: overallScore !== null && overallScore >= 75 && writingPassed, xpGained };
    });
  }

  /** Progress only: never returns exercise answer keys. */
  async getKoreanPath(currentUser: AuthenticatedUser) {
    const studentProfileId = this.getStudentProfileId(currentUser);
    const world = await this.prisma.world.findUnique({
      where: { key: 'korean-learning' },
      include: { chapters: { where: { status: MissionStatus.ACTIVE }, orderBy: { chapterNumber: 'asc' },
        include: { competencies: { select: { id: true } }, quests: { where: { status: MissionStatus.ACTIVE }, orderBy: { code: 'asc' },
          include: { _count: { select: { questions: { where: { status: 'ACTIVE' } } } } } } } } },
    });
    if (!world?.isActive) throw new NotFoundException('Jalur Korea belum diaktifkan.');
    const passed = await this.getPassedQuestIds(studentProfileId, world.id, 75, false);
    const lessons = world.chapters.flatMap(chapter => chapter.quests).filter(q => q._count.questions >= 10);
    const available = availableKoreanQuests(world.chapters.flatMap(chapter => chapter.quests
      .filter(q => q._count.questions >= 10).map(q => ({ ...q, chapter }))), passed);
    const availableIds = new Set(available.map(q => q.id));
    const next = available.find(q => !optionalKoreanQuest(q.code));
    const pending = await this.prisma.questAssignment.findMany({ where: { studentProfileId, worldId: world.id,
      attempt: { status: AttemptStatus.SUBMITTED, answers: { some: { evaluationStatus: 'MENTOR_REVIEW_NEEDED' } } } }, select: { questId: true } });
    const pendingIds = new Set(pending.map(item => item.questId));
    const practiceWorlds = await this.prisma.world.findMany({ where: { isActive: true, key: { in: ['korean-topik-pbt', 'korean-topik-ibt'] } },
      orderBy: { orderNumber: 'asc' }, include: { quests: { where: { status: 'ACTIVE' }, select: {
        title: true, estimatedMinutes: true, missionType: true, _count: { select: { questions: { where: { status: 'ACTIVE' } } } },
      } } } });
    return {
      worldKey: world.key, name: world.name, passScore: 75,
      contentRelease: 'hangul-topik6-v2', lessonCount: lessons.length,
      completedLessonCount: lessons.filter(q => passed.has(q.id)).length,
      nextLessonCode: next?.code ?? null,
      practiceExams: practiceWorlds.flatMap(item => item.quests.map(quest => ({ worldKey: item.key,
        title: quest.title, minutes: quest.estimatedMinutes, mode: koreanMockMode(quest.missionType), questionCount: quest._count.questions }))),
      units: world.chapters.map(chapter => ({ id: chapter.id, code: chapter.chapterCode,
        competencyId: chapter.competencies[0]?.id, optional: optionalKoreanQuest(`${chapter.chapterCode}-L01`),
        levelCode: chapter.subWorldKey, levelName: chapter.subWorldName, title: chapter.title,
        goal: chapter.goal, prerequisiteUnitId: chapter.prerequisiteChapterId,
        lessons: chapter.quests.filter(q => q._count.questions >= 10).map(quest => ({
          id: quest.id, code: quest.code, title: quest.title, estimatedMinutes: quest.estimatedMinutes,
          xpReward: quest.xpRewardFirst, activityCount: quest._count.questions,
          state: passed.has(quest.id) ? 'COMPLETED' : pendingIds.has(quest.id) ? 'REVIEW_PENDING' : availableIds.has(quest.id) ? 'AVAILABLE' : 'LOCKED',
        })),
      })),
    };
  }

  async getTodayQuest(currentUser: AuthenticatedUser, worldKey: string, competencyId?: string) {
    const studentProfileId = this.getStudentProfileId(currentUser);
    const world = await this.resolvePlayableWorld(worldKey);

    if (!world) {
      throw new NotFoundException(
        `Belum ada world yang punya misi aktif minimal ${MIN_ACTIVE_QUEST_QUESTIONS} pertanyaan.`,
      );
    }

    const assignedDate = startOfDay(new Date());

    if (competencyId) {
      const curriculumAssignment = await this.getOrCreateCurriculumAssignment(
        studentProfileId,
        world.id,
        assignedDate,
        competencyId,
      );
      this.ensureAssignmentReady(curriculumAssignment);
      return this.serializeAssignment(curriculumAssignment);
    }

    let assignment = await this.prisma.questAssignment.findUnique({
      where: {
        studentProfileId_worldId_assignedDate_sequenceNumber: {
          studentProfileId,
          worldId: world.id,
          assignedDate,
          sequenceNumber: 1,
        },
      },
      include: assignmentInclude,
    });

    if (
      assignment &&
      assignment.quest.questions.length < MIN_ACTIVE_QUEST_QUESTIONS
    ) {
      const replacementQuest = await this.pickQuestForToday(world.id, [assignment.questId], competencyId, studentProfileId)
        .catch(() => this.pickQuestFromAnyReadyWorld(assignment!.questId));
      if (replacementQuest.id !== assignment.questId) {
        await this.prisma.$transaction(async (tx) => {
          if (assignment?.attempt) {
            await tx.questAnswer.deleteMany({ where: { questAttemptId: assignment.attempt.id } });
            await tx.questAttempt.delete({ where: { id: assignment.attempt.id } });
          }
          await tx.questAssignment.update({
            where: { id: assignment!.id },
            data: {
              worldId: replacementQuest.worldId,
              questId: replacementQuest.id,
              status: AssignmentStatus.ASSIGNED,
            },
          });
        });
        assignment = await this.prisma.questAssignment.findUnique({
          where: {
            studentProfileId_worldId_assignedDate_sequenceNumber: {
              studentProfileId,
              worldId: replacementQuest.worldId,
              assignedDate,
              sequenceNumber: 1,
            },
          },
          include: assignmentInclude,
        });
      }
    }

    if (
      assignment &&
      competencyId &&
      assignment.attempt?.status !== AttemptStatus.SUBMITTED &&
      !assignment.quest.questions.some((question) => question.competencyId === competencyId)
    ) {
      const targetedQuest = await this.pickQuestForToday(world.id, [assignment.questId], competencyId, studentProfileId).catch(() => null);
      if (targetedQuest && targetedQuest.id !== assignment.questId) {
        await this.prisma.$transaction(async (tx) => {
          if (assignment?.attempt) {
            await tx.questAnswer.deleteMany({ where: { questAttemptId: assignment.attempt.id } });
            await tx.questAttempt.delete({ where: { id: assignment.attempt.id } });
          }
          await tx.questAssignment.update({
            where: { id: assignment!.id },
            data: {
              questId: targetedQuest.id,
              status: AssignmentStatus.ASSIGNED,
            },
          });
        });
        assignment = await this.prisma.questAssignment.findUnique({
          where: {
            studentProfileId_worldId_assignedDate_sequenceNumber: {
              studentProfileId,
              worldId: world.id,
              assignedDate,
              sequenceNumber: 1,
            },
          },
          include: assignmentInclude,
        });
      }
    }

    if (!assignment) {
      const quest = await this.pickQuestForToday(world.id, undefined, competencyId, studentProfileId);

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

    this.ensureAssignmentReady(assignment);

    return this.serializeAssignment(assignment);
  }

  // --- Pengaturan "berapa misi per hari" ---

  async getSetting(currentUser: AuthenticatedUser) {
    const setting = await this.getOrCreateQuestSetting(
      this.getStudentProfileId(currentUser),
    );
    return { dailyQuestCount: setting.dailyQuestCount };
  }

  async updateSetting(currentUser: AuthenticatedUser, dto: UpdateQuestSettingDto) {
    const studentProfileId = this.getStudentProfileId(currentUser);
    await this.getOrCreateQuestSetting(studentProfileId);
    const updated = await this.prisma.studentQuestSetting.update({
      where: { studentProfileId },
      data: { dailyQuestCount: dto.dailyQuestCount },
    });
    return { dailyQuestCount: updated.dailyQuestCount };
  }

  /** Semua assignment hari ini untuk satu dunia (sequence 1..N) - buat progress "misi 2/3 selesai". */
  async getTodayAll(currentUser: AuthenticatedUser, worldKey: string) {
    const studentProfileId = this.getStudentProfileId(currentUser);
    const world = await this.resolvePlayableWorld(worldKey);
    if (!world) {
      throw new NotFoundException(
        `Belum ada world yang punya misi aktif minimal ${MIN_ACTIVE_QUEST_QUESTIONS} pertanyaan.`,
      );
    }
    const assignedDate = startOfDay(new Date());
    const setting = await this.getOrCreateQuestSetting(studentProfileId);

    const assignments = await this.prisma.questAssignment.findMany({
      where: { studentProfileId, worldId: world.id, assignedDate },
      orderBy: { sequenceNumber: "asc" },
      include: assignmentInclude,
    });

    return {
      dailyQuestCount: setting.dailyQuestCount,
      assignments: assignments.map((assignment) => this.serializeAssignment(assignment)),
      canRequestNext:
        assignments.length < setting.dailyQuestCount &&
        (assignments.length === 0 ||
          assignments[assignments.length - 1].attempt?.status === AttemptStatus.SUBMITTED),
    };
  }

  async getHistory(currentUser: AuthenticatedUser, worldKey?: string) {
    const studentProfileId = this.getStudentProfileId(currentUser);
    const key = worldKey?.trim().toLowerCase();

    const assignments = await this.prisma.questAssignment.findMany({
      where: {
        studentProfileId,
        ...(key ? { world: { key } } : {}),
        attempt: { isNot: null },
      },
      orderBy: [{ assignedDate: "desc" }, { sequenceNumber: "desc" }],
      take: 20,
      include: {
        world: { select: { key: true, name: true } },
        quest: { select: { title: true } },
        attempt: {
          include: {
            answers: {
              include: {
                question: {
                  select: {
                    questionText: true,
                    questionType: true,
                    competency: { select: { name: true } },
                  },
                },
              },
              orderBy: { updatedAt: "desc" },
            },
          },
        },
      },
    });

    const submittedAssignments = assignments.filter(
      (assignment) => assignment.attempt?.status === AttemptStatus.SUBMITTED,
    );
    const answers = submittedAssignments.flatMap((assignment) => assignment.attempt?.answers ?? []);
    const autoScoredAnswers = answers.filter((answer) => answer.isCorrect !== null);
    const correctAnswers = autoScoredAnswers.filter((answer) => answer.isCorrect === true).length;
    const reviewQuestions = answers.filter((answer) => answer.isCorrect === null).length;
    const averageScore = submittedAssignments.length
      ? Math.round(
          submittedAssignments.reduce(
            (sum, assignment) => sum + Number(assignment.attempt?.overallScore ?? 0),
            0,
          ) / submittedAssignments.length,
        )
      : 0;

    const weakSpotCounts = new Map<string, { label: string; detail: string; count: number }>();
    for (const answer of answers) {
      if (answer.isCorrect !== false) continue;
      const label = answer.question.competency?.name ?? this.questionTypeLabel(answer.question.questionType);
      const existing = weakSpotCounts.get(label) ?? {
        label,
        detail: this.questionTypeLabel(answer.question.questionType),
        count: 0,
      };
      existing.count += 1;
      weakSpotCounts.set(label, existing);
    }

    const weakSpots = [...weakSpotCounts.values()]
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    return {
      summary: {
        totalAttempts: assignments.length,
        completedAttempts: submittedAssignments.length,
        totalQuestions: autoScoredAnswers.length,
        correctAnswers,
        reviewQuestions,
        accuracy: autoScoredAnswers.length
          ? Math.round((correctAnswers / autoScoredAnswers.length) * 100)
          : 0,
        averageScore,
      },
      weakSpots,
      recentAttempts: submittedAssignments.slice(0, 8).map((assignment) => {
        const attempt = assignment.attempt!;
        const attemptAnswers = attempt.answers;
        const scored = attemptAnswers.filter((answer) => answer.isCorrect !== null);
        const correct = scored.filter((answer) => answer.isCorrect === true).length;
        const review = attemptAnswers.filter((answer) => answer.isCorrect === null).length;
        return {
          id: attempt.id,
          title: assignment.quest.title,
          worldKey: assignment.world.key,
          worldName: assignment.world.name,
          submittedAt: attempt.submittedAt,
          score: Number(attempt.overallScore ?? 0),
          totalQuestions: scored.length,
          correctAnswers: correct,
          reviewQuestions: review,
        };
      }),
    };
  }

  /**
   * Misi tambahan hari ini (sequence 2+) - hanya kalau belum menyentuh batas
   * StudentQuestSetting.dailyQuestCount DAN misi paling akhir sudah
   * SUBMITTED (tidak boleh minta misi baru sambil masih ada yang mengambang).
   */
  async requestNextQuest(currentUser: AuthenticatedUser, worldKey: string, competencyId?: string) {
    const studentProfileId = this.getStudentProfileId(currentUser);
    const world = await this.resolvePlayableWorld(worldKey);
    if (!world) {
      throw new NotFoundException(
        `Belum ada world yang punya misi aktif minimal ${MIN_ACTIVE_QUEST_QUESTIONS} pertanyaan.`,
      );
    }
    const assignedDate = startOfDay(new Date());
    const setting = await this.getOrCreateQuestSetting(studentProfileId);

    const todayAssignments = await this.prisma.questAssignment.findMany({
      where: { studentProfileId, worldId: world.id, assignedDate },
      orderBy: { sequenceNumber: "asc" },
      include: { attempt: true },
    });

    if (todayAssignments.length === 0) {
      throw new BadRequestException(
        "Ambil misi hari ini dulu lewat GET /student/quests/today sebelum minta misi tambahan.",
      );
    }
    if (todayAssignments.length >= setting.dailyQuestCount) {
      throw new BadRequestException(
        `Sudah mencapai batas ${setting.dailyQuestCount} misi hari ini. Ubah di pengaturan kalau mau lebih banyak.`,
      );
    }
    const lastAssignment = todayAssignments[todayAssignments.length - 1];
    if (lastAssignment.attempt?.status !== AttemptStatus.SUBMITTED) {
      throw new BadRequestException(
        "Selesaikan misi yang sedang berjalan dulu sebelum minta misi tambahan.",
      );
    }

    const usedQuestIds = todayAssignments.map((assignment) => assignment.questId);
    const quest = await this.pickQuestForToday(world.id, usedQuestIds, competencyId, studentProfileId).catch(() =>
      this.pickQuestForToday(world.id, undefined, undefined, studentProfileId),
    );

    const assignment = await this.prisma.questAssignment.create({
      data: {
        studentProfileId,
        worldId: world.id,
        questId: quest.id,
        assignedDate,
        sequenceNumber: lastAssignment.sequenceNumber + 1,
      },
      include: assignmentInclude,
    });

    return this.serializeAssignment(assignment);
  }

  private async getOrCreateQuestSetting(studentProfileId: string) {
    const existing = await this.prisma.studentQuestSetting.findUnique({
      where: { studentProfileId },
    });
    if (existing) return existing;
    return this.prisma.studentQuestSetting.create({ data: { studentProfileId } });
  }

  private async getOrCreateCurriculumAssignment(
    studentProfileId: string,
    worldId: string,
    assignedDate: Date,
    competencyId: string,
  ) {
    const existingAssignments = await this.prisma.questAssignment.findMany({
      where: {
        studentProfileId,
        worldId,
        assignedDate,
        quest: {
          questions: {
            some: { status: "ACTIVE", competencyId },
          },
        },
      },
      orderBy: { sequenceNumber: "desc" },
      include: assignmentInclude,
    });

    const openAssignment = existingAssignments.find(
      (assignment) => assignment.attempt?.status !== AttemptStatus.SUBMITTED,
    );
    if (openAssignment) return openAssignment;

    // Quest kompetensi ini yang sudah dikerjakan hari ini tidak diulang di
    // hari yang sama (mis. gagal lalu langsung minta lagi -> quest berikutnya).
    const todayQuestIds = existingAssignments.map((assignment) => assignment.questId);
    const quest = await this.pickQuestForToday(worldId, todayQuestIds, competencyId, studentProfileId).catch(() =>
      this.pickQuestForToday(worldId, undefined, competencyId, studentProfileId),
    );
    const lastAssignment = await this.prisma.questAssignment.findFirst({
      where: { studentProfileId, worldId, assignedDate },
      orderBy: { sequenceNumber: "desc" },
      select: { sequenceNumber: true, attempt: { select: { status: true } } },
    });

    if (quest.code.startsWith('KOR-')) {
      const setting = await this.prisma.studentQuestSetting.findUnique({ where: { studentProfileId } });
      if (lastAssignment && lastAssignment.attempt?.status !== AttemptStatus.SUBMITTED) throw new BadRequestException('Selesaikan misi yang sedang terbuka dahulu.');
      if ((lastAssignment?.sequenceNumber ?? 0) >= (setting?.dailyQuestCount ?? 1)) throw new BadRequestException('Target misi harian sudah tercapai.');
    }

    return this.prisma.questAssignment.create({
      data: {
        studentProfileId,
        worldId,
        questId: quest.id,
        assignedDate,
        sequenceNumber: (lastAssignment?.sequenceNumber ?? 0) + 1,
      },
      include: assignmentInclude,
    });
  }

  private ensureAssignmentReady(assignment: AssignmentWithQuest) {
    if (assignment.quest.questions.length === 0) {
      throw new NotFoundException("Misi ini belum punya pertanyaan aktif.");
    }
    if (assignment.quest.questions.length < MIN_ACTIVE_QUEST_QUESTIONS) {
      throw new NotFoundException(
        `Misi hari ini baru punya ${assignment.quest.questions.length} pertanyaan aktif. Minimal ${MIN_ACTIVE_QUEST_QUESTIONS} pertanyaan.`,
      );
    }
  }

  async startAttempt(currentUser: AuthenticatedUser, assignmentId: string) {
    const assignment = await this.getAssignmentForStudent(currentUser, assignmentId);

    if (assignment.attempt) {
      if (assignment.attempt.status !== AttemptStatus.IN_PROGRESS) {
        throw new BadRequestException("Quest ini sudah diselesaikan.");
      }
      return { ...assignment.attempt, expiresAt: koreanExamDeadline(assignment.quest.missionType, assignment.attempt.startedAt) };
    }

    const attempt = await this.prisma.$transaction(async (tx) => {
      await tx.questAssignment.update({
        where: { id: assignment.id },
        data: { status: AssignmentStatus.STARTED },
      });

      return tx.questAttempt.create({
        data: { questAssignmentId: assignment.id },
      });
    });
    return { ...attempt, expiresAt: koreanExamDeadline(assignment.quest.missionType, attempt.startedAt) };
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
    const deadline = koreanExamDeadline(assignment.quest.missionType, assignment.attempt?.startedAt);
    if (deadline && new Date() >= deadline) throw new BadRequestException('Waktu simulasi habis. Kirim jawaban yang sudah tersimpan untuk melihat hasil.');

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
        let evaluation = evaluateQuestAnswer(toEvaluationQuestion(question), payload);
        if (freshAssignment.quest.code.startsWith('KOR-') && question.questionType === 'LONG_TEXT') {
          const config = JSON.parse(question.scoringConfig ?? '{}') as { minCharacters?: number; maxCharacters?: number };
          const length = Array.from(typeof payload?.text === 'string' ? payload.text.trim() : '').length;
          if (length < (config.minCharacters ?? 1) || length > (config.maxCharacters ?? question.maxLength ?? 5000)) {
            if (!koreanMockMode(freshAssignment.quest.missionType)) throw new BadRequestException(`Writing wajib memenuhi ${config.minCharacters ?? 1}–${config.maxCharacters ?? question.maxLength} karakter termasuk spasi.`);
            evaluation = { questionId: question.id, score: 0, isCorrect: false, evaluationStatus: 'AUTO_SCORED', detail: { reason: 'Writing task missing or outside requested length; no essay quality score was invented.' } };
          }
        }
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
      const pendingReview = evaluations.some(e => e.score === null);
      const exam = summarizeKoreanExam(freshAssignment.quest.missionType, freshAssignment.quest.questions, evaluations);
      const overallScore =
        exam ? exam.overallScore : pendingReview && freshAssignment.quest.code.startsWith('KOR-') ? null : scoredEvaluations.length === 0
          ? 0
          : Math.round(scoredEvaluations.reduce((sum, e) => sum + e.score, 0) / scoredEvaluations.length);
      const passScore = freshAssignment.quest.code.startsWith('KOR-') ? 75 : QUEST_PASS_SCORE;
      let xpReward = freshAssignment.quest.xpRewardFirst;
      if (freshAssignment.quest.code.startsWith('KOR-')) {
        const previousPasses = await tx.questAssignment.count({ where: {
          studentProfileId, questId: freshAssignment.questId,
          attempt: { status: AttemptStatus.SUBMITTED, overallScore: { gte: passScore },
            answers: { none: { OR: [{ evaluationStatus: 'MENTOR_REVIEW_NEEDED' }, { question: { questionType: 'LONG_TEXT' }, score: { lt: 75 } }] } } },
        } });
        const multiplier = previousPasses === 0 ? 1 : previousPasses === 1
          ? Number(freshAssignment.quest.xpMultiplierSecond ?? 0.5)
          : Number(freshAssignment.quest.xpMultiplierThirdPlus ?? 0.25);
        xpReward = overallScore !== null && overallScore >= passScore ? Math.round(xpReward * multiplier) : 0;
      }

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
        passScore,
        passed: overallScore !== null && overallScore >= passScore,
        reviewPending: pendingReview,
        exam,
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
      exam: summarizeKoreanExam(assignment.quest.missionType, assignment.quest.questions, assignment.attempt.answers.map(a => ({ questionId: a.questQuestionId, score: a.score === null ? null : Number(a.score) }))),
      overallScore: assignment.attempt.overallScore ? Number(assignment.attempt.overallScore) : 0,
      passScore: assignment.quest.code.startsWith('KOR-') ? 75 : QUEST_PASS_SCORE,
      reviewPending: assignment.attempt.answers.some(a => a.evaluationStatus === 'MENTOR_REVIEW_NEEDED'),
      passed: Number(assignment.attempt.overallScore ?? 0) >= (assignment.quest.code.startsWith('KOR-') ? 75 : QUEST_PASS_SCORE) &&
        (!assignment.quest.code.startsWith('KOR-') || assignment.quest.questions.filter(q => q.questionType === 'LONG_TEXT').every(q => Number(answersByQuestionId.get(q.id)?.score ?? 0) >= 75)),
      questions: assignment.quest.questions.map((question) => {
        const answer = answersByQuestionId.get(question.id);
        const evaluation: QuestAnswerEvaluationResult = {
          questionId: question.id,
          score: answer?.score !== null && answer?.score !== undefined ? Number(answer.score) : null,
          isCorrect: answer?.isCorrect ?? null,
          evaluationStatus: answer?.evaluationStatus ?? "MENTOR_REVIEW_NEEDED",
          detail: (answer?.evaluatorDetail as Record<string, unknown>) ?? {},
        };
        return this.serializeQuestionResult(question, evaluation, answer?.payload ?? null);
      }),
    };
  }

  /**
   * Memilih quest berikutnya secara berjenjang: quest diurutkan per chapter
   * (chapterNumber naik - mis. Detectivia Pemula -> Expert), lalu siswa
   * mendapat quest PERTAMA yang belum ia lulusi (attempt SUBMITTED dengan
   * skor >= QUEST_PASS_SCORE). Quest yang gagal otomatis muncul lagi sebagai
   * remedial (tapi tidak di hari yang sama, karena quest hari ini masuk
   * excludeQuestIds). Kalau semua sudah lulus - atau studentProfileId tidak
   * diberikan - kembali ke rotasi harian lama sebagai mode latihan ulang.
   */
  private async pickQuestForToday(
    worldId: string,
    excludeQuestIds?: string[],
    competencyId?: string,
    studentProfileId?: string,
  ) {
    const world = await this.prisma.world.findUnique({ where: { id: worldId }, select: { key: true } });
    const isKorean = world?.key === 'korean-learning' || world?.key === 'korean-topik-pbt' || world?.key === 'korean-topik-ibt';
    const activeQuests = await this.prisma.quest.findMany({
      where: {
        worldId,
        status: "ACTIVE",
        questions: { some: { status: "ACTIVE", ...(competencyId && !isKorean ? { competencyId } : {}) } },
      },
      orderBy: { createdAt: "asc" },
      include: {
        chapter: { select: { chapterNumber: true, prerequisiteChapterId: true, competencies: { select: { id: true } } } },
        _count: { select: { questions: { where: { status: "ACTIVE" } } } },
      },
    });

    const chapterOrder = (quest: (typeof activeQuests)[number]) =>
      quest.chapter?.chapterNumber ?? Number.MAX_SAFE_INTEGER;
    // Urut per chapter (quest tanpa chapter di akhir); sort() stabil, jadi
    // urutan createdAt di dalam satu chapter tetap terjaga.
    const allReadyQuests = activeQuests
      .filter((quest) => quest._count.questions >= MIN_ACTIVE_QUEST_QUESTIONS)
      .sort((a, b) => chapterOrder(a) - chapterOrder(b) || (isKorean ? a.code.localeCompare(b.code) : 0));
    const excluded = new Set(excludeQuestIds ?? []);
    const readyQuests = allReadyQuests.filter((quest) => !excluded.has(quest.id) &&
      (!isKorean || !competencyId || quest.chapter?.competencies.some(c => c.id === competencyId)));

    if (studentProfileId && allReadyQuests.length > 0) {
      const passedQuestIds = await this.getPassedQuestIds(studentProfileId, worldId, isKorean ? 75 : QUEST_PASS_SCORE, !isKorean);
      const unpassed = allReadyQuests.filter((quest) => !passedQuestIds.has(quest.id));
      if (unpassed.length > 0) {
        if (isKorean) {
          const available = availableKoreanQuests(allReadyQuests, passedQuestIds);
          const current = available.find(q => competencyId ? q.chapter?.competencies.some(c => c.id === competencyId) : !optionalKoreanQuest(q.code));
          if (!current) {
            const review = allReadyQuests.find(q => passedQuestIds.has(q.id) && (competencyId ? q.chapter?.competencies.some(c => c.id === competencyId) : !optionalKoreanQuest(q.code)));
            if (review) return review;
            throw new ForbiddenException('Selesaikan prasyarat dengan skor minimal 75 dan tunggu penilaian writing bila masih pending.');
          }
          // Retry the failed lesson before unlocking the next one, including on the same day.
          return current;
        }
        // Siswa hanya bergerak di chapter terendah yang belum tuntas. Kalau
        // semua quest di chapter itu sudah dicoba hari ini (excluded), quest
        // yang belum lulus diulang - bukan loncat ke chapter berikutnya.
        const currentChapter = chapterOrder(unpassed[0]);
        const inChapter = unpassed.filter((quest) => chapterOrder(quest) === currentChapter);
        return inChapter.find((quest) => !excluded.has(quest.id)) ?? inChapter[0];
      }
    }

    if (readyQuests.length === 0) {
      throw new NotFoundException(
        `Belum ada quest aktif dengan minimal ${MIN_ACTIVE_QUEST_QUESTIONS} pertanyaan untuk dunia ini.`,
      );
    }

    const dayIndex = Math.floor(Date.now() / 86_400_000);
    return readyQuests[dayIndex % readyQuests.length];
  }

  private async getPassedQuestIds(studentProfileId: string, worldId: string, passScore = QUEST_PASS_SCORE, allowUnscored = true) {
    const submitted = await this.prisma.questAssignment.findMany({
      where: {
        studentProfileId,
        worldId,
        attempt: { status: AttemptStatus.SUBMITTED, ...(!allowUnscored ? { answers: { none: { OR: [
          { evaluationStatus: 'MENTOR_REVIEW_NEEDED' as const },
          { question: { questionType: 'LONG_TEXT' as const }, score: { lt: 75 } },
        ] } } } : {}) },
      },
      select: { questId: true, attempt: { select: { overallScore: true } } },
    });
    return new Set(
      submitted
        .filter((assignment) => {
          const score = assignment.attempt?.overallScore;
          // Skor null = semua soal menunggu review mentor; jangan menahan
          // siswa di quest itu selamanya.
          return score === null || score === undefined ? allowUnscored : Number(score) >= passScore;
        })
        .map((assignment) => assignment.questId),
    );
  }

  private async pickQuestFromAnyReadyWorld(excludeQuestId?: string) {
    const activeQuests = await this.prisma.quest.findMany({
      where: {
        status: MissionStatus.ACTIVE,
        ...(excludeQuestId ? { id: { not: excludeQuestId } } : {}),
        world: { isActive: true },
        questions: { some: { status: "ACTIVE" } },
      },
      orderBy: [{ world: { orderNumber: "asc" } }, { createdAt: "asc" }],
      include: {
        _count: { select: { questions: { where: { status: "ACTIVE" } } } },
      },
    });
    const readyQuests = activeQuests.filter(
      (quest) => quest._count.questions >= MIN_ACTIVE_QUEST_QUESTIONS,
    );
    if (readyQuests.length === 0) {
      throw new NotFoundException(
        `Belum ada quest aktif dengan minimal ${MIN_ACTIVE_QUEST_QUESTIONS} pertanyaan di semua world.`,
      );
    }
    const dayIndex = Math.floor(Date.now() / 86_400_000);
    return readyQuests[dayIndex % readyQuests.length];
  }

  private async resolvePlayableWorld(worldKey: string) {
    const requestedWorld = await this.prisma.world.findFirst({
      where: {
        key: worldKey,
        isActive: true,
        quests: {
          some: {
            status: MissionStatus.ACTIVE,
            questions: { some: { status: "ACTIVE" } },
          },
        },
      },
      select: { id: true, key: true, isActive: true },
    });

    if (requestedWorld && await this.worldHasReadyQuest(requestedWorld.id)) {
      return requestedWorld;
    }

    return this.prisma.world.findFirst({
      where: {
        isActive: true,
        quests: {
          some: {
            status: MissionStatus.ACTIVE,
            questions: { some: { status: "ACTIVE" } },
          },
        },
      },
      orderBy: { orderNumber: "asc" },
      select: { id: true, key: true, isActive: true },
    }).then(async (world) => {
      if (!world) return null;
      if (await this.worldHasReadyQuest(world.id)) return world;

      const worlds = await this.prisma.world.findMany({
        where: { isActive: true },
        orderBy: { orderNumber: "asc" },
        select: { id: true, key: true, isActive: true },
      });
      for (const candidate of worlds) {
        if (await this.worldHasReadyQuest(candidate.id)) return candidate;
      }
      return null;
    });
  }

  private async worldHasReadyQuest(worldId: string) {
    const quests = await this.prisma.quest.findMany({
      where: {
        worldId,
        status: MissionStatus.ACTIVE,
        questions: { some: { status: "ACTIVE" } },
      },
      select: {
        id: true,
        _count: { select: { questions: { where: { status: "ACTIVE" } } } },
      },
    });
    return quests.some((quest) => quest._count.questions >= MIN_ACTIVE_QUEST_QUESTIONS);
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
        missionType: assignment.quest.missionType,
        estimatedMinutes: assignment.quest.estimatedMinutes,
        rewardXp: assignment.quest.xpRewardFirst,
        hints: assignment.quest.hints,
        chapter: assignment.quest.chapter
          ? { id: assignment.quest.chapter.id, title: assignment.quest.chapter.title }
          : null,
      },
      attempt: assignment.attempt
        ? { id: assignment.attempt.id, status: assignment.attempt.status,
            expiresAt: koreanExamDeadline(assignment.quest.missionType, assignment.attempt.startedAt) }
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
      feedback: evaluation.evaluationStatus === 'VALIDATED' ? evaluation.detail.feedback ?? null : null,
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
    const label = item.label?.trim();
    const description = item.description?.trim();
    if (description && !this.looksInternalCode(description)) return description;
    if (label && !this.looksInternalCode(label)) return label;

    const optionId = item.itemId.includes("_")
      ? item.itemId.split("_").at(-1)
      : item.itemId;
    const linkedOption = options.find(
      (option) => option.optionId === optionId || option.optionId === item.itemId,
    );
    const optionLabel = linkedOption?.label?.trim();
    if (optionLabel && !this.looksInternalCode(optionLabel)) return optionLabel;

    return optionId && !this.looksInternalCode(optionId) ? optionId : `Item ${optionId || item.displayOrder}`;
  }

  private looksInternalCode(value: string) {
    return /^[A-Z]{2,}_[A-Z0-9_]+$/.test(value.trim());
  }

  private questionTypeLabel(type: string) {
    return type
      .split("_")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(" ");
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
