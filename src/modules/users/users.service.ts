import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, UserRole, UserStatus } from "@prisma/client";
import * as bcrypt from "bcrypt";
import { PaginationQueryDto } from "../../common/dto/pagination-query.dto";
import {
  getPagination,
  getPaginationMeta,
} from "../../common/utils/pagination.util";
import { PrismaService } from "../../database/prisma/prisma.service";
import { CreateUserDto } from "./dto/create-user.dto";
import { LearningHistoryQueryDto } from "./dto/learning-history-query.dto";
import { UpdateUserDto } from "./dto/update-user.dto";

const PASSWORD_HASH_ROUNDS = 12;

type UsersQuery = PaginationQueryDto & {
  role?: "STUDENT" | "TEACHER" | "PARENT";
  email?: string;
  phone?: string;
  status?: UserStatus;
};

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: UsersQuery) {
    const pagination = getPagination(query);
    if (query.role === "PARENT") {
      return {
        data: [],
        meta: getPaginationMeta({
          page: pagination.page,
          limit: pagination.limit,
          total: 0,
        }),
      };
    }

    const role = query.role as UserRole | undefined;
    const where: Prisma.UserWhereInput = {
      deletedAt: null,
      ...(role ? { role } : {}),
      ...(query.email
        ? { email: { contains: query.email, mode: "insensitive" as const } }
        : {}),
      ...(query.phone
        ? { phone: { contains: query.phone, mode: "insensitive" as const } }
        : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: "insensitive" as const } },
              { email: { contains: query.search, mode: "insensitive" as const } },
              { phone: { contains: query.search, mode: "insensitive" as const } },
              {
                studentProfile: {
                  fullName: {
                    contains: query.search,
                    mode: "insensitive" as const,
                  },
                },
              },
              {
                studentProfile: {
                  participantCode: {
                    contains: query.search,
                    mode: "insensitive" as const,
                  },
                },
              },
            ],
          }
        : {}),
    };

    const [users, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          status: true,
          lastLoginAt: true,
          createdAt: true,
          studentProfile: {
            select: {
              id: true,
              fullName: true,
              participantCode: true,
              gradeLevel: true,
              academicYear: true,
              school: { select: { id: true, name: true, slug: true } },
              classrooms: {
                where: { leftAt: null },
                select: {
                  classroom: {
                    select: { id: true, name: true, gradeLevel: true },
                  },
                },
              },
            },
          },
          teacherProfile: {
            select: {
              id: true,
              employeeNumber: true,
              subjectSpecialization: true,
              school: { select: { id: true, name: true, slug: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: pagination.skip,
        take: pagination.take,
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: users,
      meta: getPaginationMeta({
        page: pagination.page,
        limit: pagination.limit,
        total,
      }),
    };
  }

  async create(dto: CreateUserDto) {
    if (dto.role !== UserRole.STUDENT && dto.role !== UserRole.TEACHER) {
      throw new BadRequestException("Role ini belum didukung di modul Users.");
    }
    await this.ensureEmailAvailable(dto.email);
    if (dto.participantCode) {
      await this.ensureParticipantCodeAvailable(dto.participantCode);
    }
    if (dto.role === UserRole.TEACHER && !dto.schoolId) {
      throw new BadRequestException("Guru harus terhubung ke sekolah.");
    }

    const passwordHash = dto.password
      ? await bcrypt.hash(dto.password, PASSWORD_HASH_ROUNDS)
      : undefined;

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: dto.name.trim(),
          email: dto.email?.trim().toLowerCase(),
          phone: dto.phone,
          passwordHash,
          role: dto.role,
          status: dto.status,
        },
      });

      if (dto.role === UserRole.STUDENT) {
        await tx.studentProfile.create({
          data: {
            userId: user.id,
            schoolId: dto.schoolId,
            participantCode: dto.participantCode?.trim().toUpperCase(),
            fullName: dto.name.trim(),
            phone: dto.phone,
            gradeLevel: dto.gradeLevel,
            academicYear: dto.academicYear,
          },
        });
      }

      if (dto.role === UserRole.TEACHER) {
        await tx.teacherProfile.create({
          data: {
            userId: user.id,
            schoolId: dto.schoolId!,
            subjectSpecialization: dto.subjectSpecialization,
          },
        });
      }

      return tx.user.findUniqueOrThrow({
        where: { id: user.id },
        include: { studentProfile: true, teacherProfile: true },
      });
    });
  }

  async findLearningHistory(query: LearningHistoryQueryDto) {
    const pagination = getPagination(query);
    const type = query.type ?? "ALL";
    const result = query.result ?? "ALL";
    const search = query.search?.trim();

    const rows: {
      id: string;
      type: "ONBOARDING" | "PLACEMENT" | "QUEST";
      userId: string;
      studentProfileId: string;
      studentName: string;
      email: string | null;
      world: string | null;
      activity: string;
      questionText: string;
      questionType: string;
      competency: string | null;
      selectedAnswer: unknown;
      correctAnswer: unknown;
      result: "CORRECT" | "WRONG" | "SKIPPED" | "REVIEW";
      score: number | null;
      answeredAt: Date;
    }[] = [];

    if (type === "ALL" || type === "ONBOARDING") {
      const onboardings = await this.prisma.studentOnboarding.findMany({
        where: {
          completedAt: { not: null },
          ...(search
            ? {
                student: {
                  OR: [
                    { fullName: { contains: search, mode: "insensitive" } },
                    { user: { email: { contains: search, mode: "insensitive" } } },
                  ],
                },
              }
            : {}),
        },
        include: {
          student: {
            include: { user: { select: { id: true, email: true, name: true } } },
          },
        },
        orderBy: { completedAt: "desc" },
        take: 500,
      });

      for (const item of onboardings) {
        rows.push({
          id: item.id,
          type: "ONBOARDING",
          userId: item.student.user?.id ?? "",
          studentProfileId: item.studentProfileId,
          studentName: item.student.fullName,
          email: item.student.user?.email ?? null,
          world: item.learningWorld,
          activity: "Onboarding 7 Pertanyaan",
          questionText: "Ringkasan onboarding",
          questionType: "ONBOARDING",
          competency: null,
          selectedAnswer: item.rawAnswers ?? {
            learningGoal: item.learningGoal,
            learningWorld: item.learningWorld,
            gradeChoice: item.gradeChoice,
            selfReportedLevel: item.selfReportedLevel,
            learningFormats: item.learningFormats,
            dailyDuration: item.dailyDuration,
            studyTime: item.studyTime,
          },
          correctAnswer: null,
          result: "REVIEW",
          score: null,
          answeredAt: item.completedAt ?? item.updatedAt,
        });
      }
    }

    if (type === "ALL" || type === "PLACEMENT") {
      const placementAnswers = await this.prisma.placementAnswer.findMany({
        where: {
          attempt: {
            student: {
              ...(search
                ? {
                    OR: [
                      { fullName: { contains: search, mode: "insensitive" } },
                      { user: { email: { contains: search, mode: "insensitive" } } },
                    ],
                  }
                : {}),
            },
          },
        },
        include: {
          attempt: {
            include: {
              student: {
                include: { user: { select: { id: true, email: true, name: true } } },
              },
            },
          },
        },
        orderBy: { updatedAt: "desc" },
        take: 1000,
      });
      const questionCodes = [...new Set(placementAnswers.map((answer) => answer.questionId))];
      const questions = await this.prisma.questQuestion.findMany({
        where: { code: { in: questionCodes } },
        select: {
          code: true,
          questionText: true,
          questionType: true,
          competency: { select: { name: true } },
          options: {
            where: { isCorrect: true },
            select: { label: true },
            take: 1,
          },
        },
      });
      const questionByCode = new Map(questions.map((question) => [question.code, question]));

      for (const answer of placementAnswers) {
        const question = questionByCode.get(answer.questionId);
        const evaluation = this.readEvaluation(answer.answer);
        rows.push({
          id: answer.id,
          type: "PLACEMENT",
          userId: answer.attempt.student.user?.id ?? "",
          studentProfileId: answer.attempt.studentProfileId,
          studentName: answer.attempt.student.fullName,
          email: answer.attempt.student.user?.email ?? null,
          world: answer.attempt.worldKey,
          activity: "Cek Awal",
          questionText: question?.questionText ?? answer.questionId,
          questionType: answer.questionType,
          competency: question?.competency.name ?? evaluation?.competency?.name ?? null,
          selectedAnswer: this.readSelectedAnswer(answer.answer),
          correctAnswer: evaluation?.correctOptionLabel ?? question?.options[0]?.label ?? null,
          result: answer.isSkipped
            ? "SKIPPED"
            : evaluation?.isCorrect === true
              ? "CORRECT"
              : evaluation?.isCorrect === false
                ? "WRONG"
                : "REVIEW",
          score: evaluation?.score ?? null,
          answeredAt: answer.clientAnsweredAt ?? answer.updatedAt,
        });
      }
    }

    if (type === "ALL" || type === "QUEST") {
      const questAnswers = await this.prisma.questAnswer.findMany({
        where: {
          attempt: {
            assignment: {
              student: {
                ...(search
                  ? {
                      OR: [
                        { fullName: { contains: search, mode: "insensitive" } },
                        { user: { email: { contains: search, mode: "insensitive" } } },
                      ],
                    }
                  : {}),
              },
            },
          },
        },
        include: {
          question: {
            select: {
              questionText: true,
              questionType: true,
              competency: { select: { name: true } },
            },
          },
          attempt: {
            include: {
              assignment: {
                include: {
                  world: { select: { key: true, name: true } },
                  quest: { select: { title: true } },
                  student: {
                    include: { user: { select: { id: true, email: true, name: true } } },
                  },
                },
              },
            },
          },
        },
        orderBy: { updatedAt: "desc" },
        take: 1000,
      });

      for (const answer of questAnswers) {
        rows.push({
          id: answer.id,
          type: "QUEST",
          userId: answer.attempt.assignment.student.user?.id ?? "",
          studentProfileId: answer.attempt.assignment.studentProfileId,
          studentName: answer.attempt.assignment.student.fullName,
          email: answer.attempt.assignment.student.user?.email ?? null,
          world: answer.attempt.assignment.world.name,
          activity: answer.attempt.assignment.quest.title,
          questionText: answer.question.questionText,
          questionType: answer.question.questionType,
          competency: answer.question.competency.name,
          selectedAnswer: answer.payload,
          correctAnswer: (answer.evaluatorDetail as Record<string, unknown> | null)?.correctOptionId ?? null,
          result: answer.isCorrect === true ? "CORRECT" : answer.isCorrect === false ? "WRONG" : "REVIEW",
          score: answer.score ? Number(answer.score) : null,
          answeredAt: answer.answeredAt ?? answer.updatedAt,
        });
      }
    }

    const filtered = rows
      .filter((row) => result === "ALL" || row.result === result)
      .sort((a, b) => b.answeredAt.getTime() - a.answeredAt.getTime());
    const data = filtered.slice(pagination.skip, pagination.skip + pagination.take);

    return {
      data,
      meta: getPaginationMeta({
        page: pagination.page,
        limit: pagination.limit,
        total: filtered.length,
      }),
    };
  }

  async findHistory(id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        studentProfile: {
          select: {
            id: true,
            fullName: true,
            gradeLevel: true,
            onboarding: true,
            placementAttempts: {
              orderBy: { createdAt: "desc" },
              include: {
                answers: { orderBy: { createdAt: "asc" } },
                analysis: true,
              },
            },
            questAssignments: {
              orderBy: { createdAt: "desc" },
              include: {
                world: { select: { key: true, name: true } },
                quest: {
                  select: {
                    id: true,
                    code: true,
                    title: true,
                    questions: {
                      orderBy: { orderNumber: "asc" },
                      select: {
                        id: true,
                        code: true,
                        questionText: true,
                        questionType: true,
                        competency: { select: { id: true, code: true, name: true } },
                      },
                    },
                  },
                },
                attempt: {
                  include: {
                    answers: {
                      include: {
                        question: {
                          select: {
                            id: true,
                            code: true,
                            questionText: true,
                            questionType: true,
                            competency: { select: { id: true, code: true, name: true } },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
    if (!user) throw new NotFoundException("User tidak ditemukan.");

    const placementQuestionCodes = user.studentProfile?.placementAttempts.flatMap((attempt) =>
      attempt.answers.map((answer) => answer.questionId),
    ) ?? [];
    const placementQuestions = placementQuestionCodes.length
      ? await this.prisma.questQuestion.findMany({
          where: { code: { in: placementQuestionCodes } },
          select: {
            code: true,
            questionText: true,
            questionType: true,
            competency: { select: { id: true, code: true, name: true } },
            options: {
              where: { isCorrect: true },
              select: { optionId: true, label: true },
              take: 1,
            },
          },
        })
      : [];
    const placementQuestionByCode = new Map(placementQuestions.map((question) => [question.code, question]));

    return {
      user: {
        id: user.id,
        name: user.studentProfile?.fullName ?? user.name,
        email: user.email,
        role: user.role,
        gradeLevel: user.studentProfile?.gradeLevel,
      },
      onboarding: user.studentProfile?.onboarding
        ? {
            completedAt: user.studentProfile.onboarding.completedAt,
            learningGoal: user.studentProfile.onboarding.learningGoal,
            learningWorld: user.studentProfile.onboarding.learningWorld,
            gradeChoice: user.studentProfile.onboarding.gradeChoice,
            selfReportedLevel: user.studentProfile.onboarding.selfReportedLevel,
            learningFormats: user.studentProfile.onboarding.learningFormats,
            dailyDuration: user.studentProfile.onboarding.dailyDuration,
            studyTime: user.studentProfile.onboarding.studyTime,
            rawAnswers: user.studentProfile.onboarding.rawAnswers,
          }
        : null,
      placementAttempts: user.studentProfile?.placementAttempts.map((attempt) => ({
        id: attempt.id,
        worldKey: attempt.worldKey,
        status: attempt.status,
        startedAt: attempt.startedAt,
        submittedAt: attempt.submittedAt,
        totalQuestions: attempt.totalQuestions,
        analysis: attempt.analysis,
        answers: attempt.answers.map((answer) => {
          const question = placementQuestionByCode.get(answer.questionId);
          const evaluation = this.readEvaluation(answer.answer);
          return {
            id: answer.id,
            questionId: answer.questionId,
            questionText: question?.questionText ?? answer.questionId,
            questionType: answer.questionType,
            competency: question?.competency ?? evaluation?.competency ?? null,
            selectedAnswer: this.readSelectedAnswer(answer.answer),
            correctAnswer: evaluation?.correctOptionLabel ?? question?.options[0]?.label ?? null,
            isCorrect: evaluation?.isCorrect ?? null,
            score: evaluation?.score ?? null,
            isSkipped: answer.isSkipped,
            answeredAt: answer.clientAnsweredAt ?? answer.updatedAt,
          };
        }),
      })) ?? [],
      questAttempts: user.studentProfile?.questAssignments
        .filter((assignment) => assignment.attempt)
        .map((assignment) => ({
          id: assignment.attempt!.id,
          world: assignment.world,
          quest: {
            id: assignment.quest.id,
            code: assignment.quest.code,
            title: assignment.quest.title,
          },
          status: assignment.attempt!.status,
          overallScore: assignment.attempt!.overallScore ? Number(assignment.attempt!.overallScore) : null,
          submittedAt: assignment.attempt!.submittedAt,
          answers: assignment.attempt!.answers.map((answer) => ({
            id: answer.id,
            questionId: answer.questQuestionId,
            questionCode: answer.question.code,
            questionText: answer.question.questionText,
            questionType: answer.question.questionType,
            competency: answer.question.competency,
            selectedAnswer: answer.payload,
            isCorrect: answer.isCorrect,
            score: answer.score ? Number(answer.score) : null,
            evaluationStatus: answer.evaluationStatus,
            answeredAt: answer.answeredAt ?? answer.updatedAt,
          })),
        })) ?? [],
    };
  }

  async update(id: string, dto: UpdateUserDto) {
    const existing = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      include: { studentProfile: true, teacherProfile: true },
    });
    if (!existing) {
      throw new NotFoundException("User tidak ditemukan.");
    }
    if (dto.email) {
      await this.ensureEmailAvailable(dto.email, id);
    }
    if (dto.participantCode) {
      await this.ensureParticipantCodeAvailable(dto.participantCode, existing.studentProfile?.id);
    }

    const passwordHash = dto.password
      ? await bcrypt.hash(dto.password, PASSWORD_HASH_ROUNDS)
      : undefined;

    return this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id },
        data: {
          name: dto.name?.trim(),
          email: dto.email?.trim().toLowerCase(),
          phone: dto.phone,
          status: dto.status,
          passwordHash,
        },
      });

      if (existing.role === UserRole.STUDENT && existing.studentProfile) {
        await tx.studentProfile.update({
          where: { id: existing.studentProfile.id },
          data: {
            schoolId: dto.schoolId,
            participantCode: dto.participantCode?.trim().toUpperCase(),
            fullName: dto.name?.trim(),
            phone: dto.phone,
            gradeLevel: dto.gradeLevel,
            academicYear: dto.academicYear,
          },
        });
      }

      if (existing.role === UserRole.TEACHER && existing.teacherProfile) {
        await tx.teacherProfile.update({
          where: { id: existing.teacherProfile.id },
          data: {
            schoolId: dto.schoolId,
            subjectSpecialization: dto.subjectSpecialization,
          },
        });
      }

      return tx.user.findUniqueOrThrow({
        where: { id },
        include: { studentProfile: true, teacherProfile: true },
      });
    });
  }

  async remove(id: string) {
    const existing = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      include: { studentProfile: true },
    });
    if (!existing) {
      throw new NotFoundException("User tidak ditemukan.");
    }

    return this.prisma.$transaction(async (tx) => {
      if (existing.studentProfile) {
        await tx.studentProfile.update({
          where: { id: existing.studentProfile.id },
          data: { deletedAt: new Date(), isActive: false },
        });
      }
      return tx.user.update({
        where: { id },
        data: { deletedAt: new Date(), status: "INACTIVE" },
      });
    });
  }

  private async ensureEmailAvailable(email?: string, ignoredId?: string) {
    if (!email) return;
    const existing = await this.prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });
    if (existing && existing.id !== ignoredId) {
      throw new ConflictException("Email sudah terdaftar.");
    }
  }

  private async ensureParticipantCodeAvailable(code: string, ignoredProfileId?: string) {
    const existing = await this.prisma.studentProfile.findUnique({
      where: { participantCode: code.trim().toUpperCase() },
    });
    if (existing && existing.id !== ignoredProfileId) {
      throw new ConflictException("Kode peserta sudah digunakan.");
    }
  }

  private readEvaluation(answer: Prisma.JsonValue) {
    if (!answer || typeof answer !== "object" || Array.isArray(answer)) return null;
    const evaluation = (answer as Record<string, unknown>).evaluation;
    if (!evaluation || typeof evaluation !== "object" || Array.isArray(evaluation)) return null;
    return evaluation as {
      competency?: { id: string; code: string; name: string } | null;
      correctOptionLabel?: string | null;
      isCorrect?: boolean | null;
      score?: number | null;
    };
  }

  private readSelectedAnswer(answer: Prisma.JsonValue) {
    if (!answer || typeof answer !== "object" || Array.isArray(answer)) return answer;
    const payload = answer as Record<string, unknown>;
    return payload.selectedOptionId ?? payload.value ?? payload;
  }
}
