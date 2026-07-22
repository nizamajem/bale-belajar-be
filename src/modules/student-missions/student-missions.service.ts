import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  AssignmentStatus,
  AttemptStatus,
  MissionStatus,
  Prisma,
  XpReason,
} from "@prisma/client";
import { AuthenticatedUser } from "../../common/types/authenticated-user.type";
import { PrismaService } from "../../database/prisma/prisma.service";
import { AiOrchestratorService } from "../ai-orchestrator/ai-orchestrator.service";
import { ExperienceLedgerService } from "../experience-ledger/experience-ledger.service";
import { MasteryService } from "../mastery/mastery.service";
import { SaveMissionAnswerDto } from "./dto/save-mission-answer.dto";
import {
  computeMissionXpReward,
  evaluateMissionAnswers,
} from "./mission-evaluation.util";

const assignmentInclude = {
  mission: {
    include: {
      competency: { select: { id: true, code: true, name: true } },
      activities: {
        orderBy: { orderNumber: "asc" as const },
        include: { options: { orderBy: { orderNumber: "asc" as const } } },
      },
    },
  },
  attempt: {
    include: { answers: true },
  },
} satisfies Prisma.DailyMissionAssignmentInclude;

type AssignmentWithMission = Prisma.DailyMissionAssignmentGetPayload<{
  include: typeof assignmentInclude;
}>;

@Injectable()
export class StudentMissionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly experienceLedgerService: ExperienceLedgerService,
    private readonly masteryService: MasteryService,
    private readonly aiOrchestratorService: AiOrchestratorService,
  ) {}

  async getTodayMission(currentUser: AuthenticatedUser, worldKey: string) {
    const studentProfileId = this.getStudentProfileId(currentUser);
    const world = await this.prisma.world.findUnique({
      where: { key: worldKey },
    });

    if (!world || !world.isActive) {
      throw new NotFoundException("Dunia tidak ditemukan.");
    }

    const assignedDate = startOfDay(new Date());

    let assignment = await this.prisma.dailyMissionAssignment.findUnique({
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
      const mission = await this.pickMissionForToday(world.id, studentProfileId);

      assignment = await this.prisma.dailyMissionAssignment.create({
        data: {
          studentProfileId,
          worldId: world.id,
          missionId: mission.id,
          assignedDate,
        },
        include: assignmentInclude,
      });
    }

    const student = await this.prisma.studentProfile.findUniqueOrThrow({
      where: { id: studentProfileId },
    });

    const narrative = await this.aiOrchestratorService.generateMissionNarrative(
      studentProfileId,
      {
        missionTitle: assignment.mission.title,
        narrativeTemplate: assignment.mission.narrativeTemplate,
        worldName: world.name,
        competencyName: assignment.mission.competency.name,
        studentName: student.fullName,
      },
    );

    return this.serializeAssignment(assignment, narrative);
  }

  async startAttempt(currentUser: AuthenticatedUser, assignmentId: string) {
    const assignment = await this.getAssignmentForStudent(
      currentUser,
      assignmentId,
    );

    if (assignment.attempt) {
      if (assignment.attempt.status !== AttemptStatus.IN_PROGRESS) {
        throw new BadRequestException("Misi hari ini sudah diselesaikan.");
      }

      return assignment.attempt;
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.dailyMissionAssignment.update({
        where: { id: assignment.id },
        data: { status: AssignmentStatus.STARTED },
      });

      return tx.missionAttempt.create({
        data: { dailyMissionAssignmentId: assignment.id },
      });
    });
  }

  async saveAnswer(
    currentUser: AuthenticatedUser,
    attemptId: string,
    activityId: string,
    dto: SaveMissionAnswerDto,
  ) {
    const assignment = await this.getAssignmentForAttempt(
      currentUser,
      attemptId,
    );
    this.ensureAttemptInProgress(assignment);
    this.ensureActivityInMission(assignment, activityId);

    if (dto.selectedOptionId) {
      this.ensureOptionInActivity(assignment, activityId, dto.selectedOptionId);
    }

    return this.prisma.missionActivityAnswer.upsert({
      where: {
        missionAttemptId_activityId: {
          missionAttemptId: attemptId,
          activityId,
        },
      },
      update: {
        selectedOptionId: dto.selectedOptionId,
        answeredAt: dto.selectedOptionId ? new Date() : undefined,
      },
      create: {
        missionAttemptId: attemptId,
        activityId,
        selectedOptionId: dto.selectedOptionId,
        answeredAt: dto.selectedOptionId ? new Date() : undefined,
      },
    });
  }

  async submitAttempt(currentUser: AuthenticatedUser, attemptId: string) {
    const studentProfileId = this.getStudentProfileId(currentUser);
    const assignment = await this.getAssignmentForAttempt(
      currentUser,
      attemptId,
    );
    this.ensureAttemptInProgress(assignment);

    return this.prisma.$transaction(async (tx) => {
      const freshAssignment = await tx.dailyMissionAssignment.findUnique({
        where: { id: assignment.id },
        include: assignmentInclude,
      });

      if (!freshAssignment?.attempt) {
        throw new NotFoundException("Attempt misi tidak ditemukan.");
      }
      this.ensureAttemptInProgress(freshAssignment);

      const evaluation = evaluateMissionAnswers(
        freshAssignment.mission.activities,
        freshAssignment.attempt.answers.map((answer) => ({
          activityId: answer.activityId,
          selectedOptionId: answer.selectedOptionId,
        })),
      );

      for (const item of evaluation.perActivity) {
        await tx.missionActivityAnswer.upsert({
          where: {
            missionAttemptId_activityId: {
              missionAttemptId: attemptId,
              activityId: item.activityId,
            },
          },
          update: {
            isCorrect: item.isCorrect,
            answeredAt: item.selectedOptionId ? new Date() : undefined,
          },
          create: {
            missionAttemptId: attemptId,
            activityId: item.activityId,
            selectedOptionId: item.selectedOptionId,
            isCorrect: item.isCorrect,
            answeredAt: item.selectedOptionId ? new Date() : undefined,
          },
        });

        await this.masteryService.recordEvidence(tx, {
          studentProfileId,
          competencyId: freshAssignment.mission.competencyId,
          isCorrect: item.isCorrect,
          sourceType: "MissionActivityAnswer",
          sourceId: item.activityId,
        });
      }

      const xpReward = computeMissionXpReward(evaluation.correctCount);
      const xpResult = await this.experienceLedgerService.appendXp(tx, {
        studentProfileId,
        worldId: freshAssignment.worldId,
        amount: xpReward,
        reason: XpReason.MISSION_COMPLETED,
        sourceType: "MissionAttempt",
        sourceId: attemptId,
      });

      await this.experienceLedgerService.registerDailyActivity(
        tx,
        studentProfileId,
      );

      await tx.dailyMissionAssignment.update({
        where: { id: freshAssignment.id },
        data: { status: AssignmentStatus.COMPLETED },
      });

      await tx.missionAttempt.update({
        where: { id: attemptId },
        data: {
          status: AttemptStatus.SUBMITTED,
          submittedAt: new Date(),
          correctCount: evaluation.correctCount,
          totalActivities: evaluation.totalActivities,
        },
      });

      const masteryState = await tx.masteryState.findUnique({
        where: {
          studentProfileId_competencyId: {
            studentProfileId,
            competencyId: freshAssignment.mission.competencyId,
          },
        },
      });

      return {
        attemptId,
        correctCount: evaluation.correctCount,
        totalActivities: evaluation.totalActivities,
        activities: evaluation.perActivity.map((item) => {
          const activity = freshAssignment.mission.activities.find(
            (candidate) => candidate.id === item.activityId,
          );

          return {
            activityId: item.activityId,
            selectedOptionId: item.selectedOptionId,
            isCorrect: item.isCorrect,
            explanation: activity?.explanation ?? null,
          };
        }),
        xpGained: xpReward,
        gameProfile: xpResult,
        mastery: masteryState
          ? {
              competencyId: masteryState.competencyId,
              masteryScore: Number(masteryState.masteryScore),
              status: masteryState.status,
              confidence: masteryState.confidence,
              evidenceCount: masteryState.evidenceCount,
            }
          : null,
      };
    });
  }

  async getResult(currentUser: AuthenticatedUser, attemptId: string) {
    const assignment = await this.getAssignmentForAttempt(
      currentUser,
      attemptId,
    );

    if (!assignment.attempt || assignment.attempt.status !== AttemptStatus.SUBMITTED) {
      throw new BadRequestException("Attempt belum disubmit.");
    }

    const studentProfileId = this.getStudentProfileId(currentUser);
    const masteryState = await this.prisma.masteryState.findUnique({
      where: {
        studentProfileId_competencyId: {
          studentProfileId,
          competencyId: assignment.mission.competencyId,
        },
      },
    });

    return {
      attemptId,
      missionTitle: assignment.mission.title,
      correctCount: assignment.attempt.correctCount,
      totalActivities: assignment.attempt.totalActivities,
      activities: assignment.mission.activities.map((activity) => {
        const answer = assignment.attempt?.answers.find(
          (item) => item.activityId === activity.id,
        );

        return {
          activityId: activity.id,
          prompt: activity.prompt,
          selectedOptionId: answer?.selectedOptionId ?? null,
          isCorrect: answer?.isCorrect ?? false,
          explanation: activity.explanation,
          options: activity.options.map((option) => ({
            id: option.id,
            optionKey: option.optionKey,
            optionText: option.optionText,
            isCorrect: option.isCorrect,
          })),
        };
      }),
      mastery: masteryState
        ? {
            competencyId: masteryState.competencyId,
            masteryScore: Number(masteryState.masteryScore),
            status: masteryState.status,
            confidence: masteryState.confidence,
            evidenceCount: masteryState.evidenceCount,
          }
        : null,
    };
  }

  private async pickMissionForToday(worldId: string, studentProfileId: string) {
    const activeMissions = await this.prisma.mission.findMany({
      where: { worldId, status: MissionStatus.ACTIVE },
    });

    if (activeMissions.length === 0) {
      throw new NotFoundException("Belum ada misi aktif untuk dunia ini.");
    }

    const masteryStates = await this.prisma.masteryState.findMany({
      where: {
        studentProfileId,
        competencyId: { in: activeMissions.map((mission) => mission.competencyId) },
      },
    });
    const masteryByCompetency = new Map(
      masteryStates.map((state) => [state.competencyId, Number(state.masteryScore)]),
    );

    const sorted = [...activeMissions].sort((a, b) => {
      const scoreA = masteryByCompetency.get(a.competencyId) ?? -1;
      const scoreB = masteryByCompetency.get(b.competencyId) ?? -1;
      return scoreA - scoreB;
    });

    return sorted[0];
  }

  private serializeAssignment(
    assignment: AssignmentWithMission,
    narrative: string,
  ) {
    const isSubmitted = assignment.attempt?.status === AttemptStatus.SUBMITTED;
    const answersByActivityId = new Map(
      (assignment.attempt?.answers ?? []).map((answer) => [
        answer.activityId,
        answer,
      ]),
    );

    return {
      assignmentId: assignment.id,
      worldId: assignment.worldId,
      status: assignment.status,
      mission: {
        id: assignment.mission.id,
        title: assignment.mission.title,
        narrative,
        estimatedMinutes: assignment.mission.estimatedMinutes,
        competency: assignment.mission.competency,
      },
      attempt: assignment.attempt
        ? {
            id: assignment.attempt.id,
            status: assignment.attempt.status,
            startedAt: assignment.attempt.startedAt,
          }
        : null,
      activities: assignment.mission.activities.map((activity) => {
        const answer = answersByActivityId.get(activity.id);

        return {
          id: activity.id,
          orderNumber: activity.orderNumber,
          prompt: activity.prompt,
          selectedOptionId: answer?.selectedOptionId ?? null,
          // Kunci jawaban & pembahasan hanya boleh terlihat setelah attempt disubmit.
          explanation: isSubmitted ? activity.explanation : null,
          options: activity.options.map((option) => ({
            id: option.id,
            optionKey: option.optionKey,
            optionText: option.optionText,
            isCorrect: isSubmitted ? option.isCorrect : undefined,
          })),
        };
      }),
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
    assignmentId: string,
  ) {
    const studentProfileId = this.getStudentProfileId(currentUser);
    const assignment = await this.prisma.dailyMissionAssignment.findFirst({
      where: { id: assignmentId, studentProfileId },
      include: assignmentInclude,
    });

    if (!assignment) {
      throw new NotFoundException("Misi tidak ditemukan.");
    }

    return assignment;
  }

  private async getAssignmentForAttempt(
    currentUser: AuthenticatedUser,
    attemptId: string,
  ) {
    const studentProfileId = this.getStudentProfileId(currentUser);
    const assignment = await this.prisma.dailyMissionAssignment.findFirst({
      where: {
        studentProfileId,
        attempt: { id: attemptId },
      },
      include: assignmentInclude,
    });

    if (!assignment) {
      throw new NotFoundException("Attempt misi tidak ditemukan.");
    }

    return assignment;
  }

  private ensureAttemptInProgress(assignment: AssignmentWithMission) {
    if (!assignment.attempt || assignment.attempt.status !== AttemptStatus.IN_PROGRESS) {
      throw new BadRequestException("Attempt misi sudah tidak aktif.");
    }
  }

  private ensureActivityInMission(
    assignment: AssignmentWithMission,
    activityId: string,
  ) {
    const exists = assignment.mission.activities.some(
      (activity) => activity.id === activityId,
    );

    if (!exists) {
      throw new BadRequestException("Aktivitas tidak termasuk dalam misi ini.");
    }
  }

  private ensureOptionInActivity(
    assignment: AssignmentWithMission,
    activityId: string,
    selectedOptionId: string,
  ) {
    const activity = assignment.mission.activities.find(
      (candidate) => candidate.id === activityId,
    );
    const exists = activity?.options.some(
      (option) => option.id === selectedOptionId,
    );

    if (!exists) {
      throw new BadRequestException("Opsi jawaban tidak valid untuk aktivitas ini.");
    }
  }
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}
