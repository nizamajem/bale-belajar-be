import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { AssessmentStatus, AssignmentStatus, Prisma } from "@prisma/client";
import { PaginationQueryDto } from "../../common/dto/pagination-query.dto";
import { getPagination, getPaginationMeta } from "../../common/utils/pagination.util";
import { PrismaService } from "../../database/prisma/prisma.service";
import { AddAssessmentClassroomDto } from "./dto/add-assessment-classroom.dto";
import { AddAssessmentQuestionDto } from "./dto/add-assessment-question.dto";
import { CreateAssessmentDto } from "./dto/create-assessment.dto";
import { UpdateAssessmentDto } from "./dto/update-assessment.dto";

@Injectable()
export class AssessmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: PaginationQueryDto) {
    const pagination = getPagination(query);
    const where: Prisma.AssessmentWhereInput = {
      deletedAt: null,
      ...(query.search
        ? {
            OR: [
              { title: { contains: query.search, mode: "insensitive" } },
              { slug: { contains: query.search, mode: "insensitive" } },
              { subject: { name: { contains: query.search, mode: "insensitive" } } },
            ],
          }
        : {}),
    };

    const [assessments, total] = await this.prisma.$transaction([
      this.prisma.assessment.findMany({
        where,
        include: {
          school: { select: { id: true, name: true, slug: true } },
          subject: { select: { id: true, code: true, name: true } },
          _count: { select: { questions: true, classrooms: true, assignments: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: pagination.skip,
        take: pagination.take,
      }),
      this.prisma.assessment.count({ where }),
    ]);

    return {
      data: assessments,
      meta: getPaginationMeta({ page: pagination.page, limit: pagination.limit, total }),
    };
  }

  async findOne(id: string) {
    const assessment = await this.prisma.assessment.findFirst({
      where: { id, deletedAt: null },
      include: {
        school: { select: { id: true, name: true, slug: true } },
        subject: { select: { id: true, code: true, name: true } },
        questions: {
          orderBy: { orderNumber: "asc" },
          include: { question: { select: { id: true, code: true, questionText: true, status: true, competencyId: true } } },
        },
        classrooms: {
          include: { classroom: { select: { id: true, name: true, gradeLevel: true, academicYear: true } } },
        },
      },
    });

    if (!assessment) {
      throw new NotFoundException("Asesmen tidak ditemukan.");
    }

    return assessment;
  }

  async create(dto: CreateAssessmentDto) {
    await this.ensureSubjectExists(dto.subjectId);
    if (dto.schoolId) {
      await this.ensureSchoolExists(dto.schoolId);
    }
    await this.ensureSlugAvailable(dto.subjectId, dto.slug);

    return this.prisma.assessment.create({
      data: {
        schoolId: dto.schoolId,
        subjectId: dto.subjectId,
        title: dto.title,
        slug: dto.slug,
        description: dto.description,
        gradeLevel: dto.gradeLevel,
        durationMinutes: dto.durationMinutes,
        startAt: dto.startAt ? new Date(dto.startAt) : undefined,
        endAt: dto.endAt ? new Date(dto.endAt) : undefined,
        accessCode: dto.accessCode,
        showResultImmediately: dto.showResultImmediately,
        allowRetake: dto.allowRetake,
        maxAttempts: dto.maxAttempts,
        status: dto.status,
        createdBy: dto.createdBy,
      },
    });
  }

  async update(id: string, dto: UpdateAssessmentDto) {
    const existing = await this.findOne(id);
    const subjectId = dto.subjectId ?? existing.subjectId;
    const slug = dto.slug ?? existing.slug;

    if (dto.subjectId) {
      await this.ensureSubjectExists(dto.subjectId);
    }
    if (dto.schoolId) {
      await this.ensureSchoolExists(dto.schoolId);
    }
    await this.ensureSlugAvailable(subjectId, slug, id);

    return this.prisma.assessment.update({
      where: { id },
      data: {
        schoolId: dto.schoolId,
        subjectId: dto.subjectId,
        title: dto.title,
        slug: dto.slug,
        description: dto.description,
        gradeLevel: dto.gradeLevel,
        durationMinutes: dto.durationMinutes,
        startAt: dto.startAt ? new Date(dto.startAt) : undefined,
        endAt: dto.endAt ? new Date(dto.endAt) : undefined,
        accessCode: dto.accessCode,
        showResultImmediately: dto.showResultImmediately,
        allowRetake: dto.allowRetake,
        maxAttempts: dto.maxAttempts,
        status: dto.status,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.assessment.update({
      where: { id },
      data: { deletedAt: new Date(), status: AssessmentStatus.ARCHIVED },
    });
  }

  async addQuestion(id: string, dto: AddAssessmentQuestionDto) {
    const assessment = await this.findOne(id);
    const question = await this.prisma.question.findFirst({
      where: { id: dto.questionId, deletedAt: null },
    });
    if (!question) {
      throw new NotFoundException("Soal tidak ditemukan.");
    }
    if (question.subjectId !== assessment.subjectId) {
      throw new BadRequestException("Soal harus sesuai mata pelajaran asesmen.");
    }

    return this.prisma.assessmentQuestion.create({
      data: {
        assessmentId: id,
        questionId: dto.questionId,
        orderNumber: dto.orderNumber,
        weightOverride: dto.weightOverride,
      },
    });
  }

  async removeQuestion(id: string, questionId: string) {
    await this.findOne(id);
    const relation = await this.prisma.assessmentQuestion.findUnique({
      where: { assessmentId_questionId: { assessmentId: id, questionId } },
    });
    if (!relation) {
      throw new NotFoundException("Soal tidak ditemukan pada asesmen.");
    }
    return this.prisma.assessmentQuestion.delete({ where: { id: relation.id } });
  }

  async addClassroom(id: string, dto: AddAssessmentClassroomDto) {
    const assessment = await this.findOne(id);
    const classroom = await this.prisma.classroom.findUnique({ where: { id: dto.classroomId } });
    if (!classroom || !classroom.isActive) {
      throw new NotFoundException("Kelas tidak ditemukan.");
    }
    if (assessment.schoolId && classroom.schoolId !== assessment.schoolId) {
      throw new BadRequestException("Kelas harus berada di sekolah asesmen.");
    }
    return this.prisma.assessmentClassroom.upsert({
      where: { assessmentId_classroomId: { assessmentId: id, classroomId: dto.classroomId } },
      update: {},
      create: { assessmentId: id, classroomId: dto.classroomId },
    });
  }

  async publish(id: string) {
    const assessment = await this.findOne(id);
    if (assessment.questions.length === 0) {
      throw new BadRequestException("Asesmen harus memiliki minimal satu soal.");
    }
    if (assessment.classrooms.length === 0) {
      throw new BadRequestException("Asesmen harus ditugaskan ke minimal satu kelas.");
    }

    return this.prisma.$transaction(async (tx) => {
      const classroomIds = assessment.classrooms.map((item) => item.classroomId);
      const classroomStudents = await tx.classroomStudent.findMany({
        where: { classroomId: { in: classroomIds }, leftAt: null },
        select: { studentId: true },
      });
      const uniqueStudentIds = [...new Set(classroomStudents.map((item) => item.studentId))];

      for (const studentId of uniqueStudentIds) {
        await tx.assessmentAssignment.upsert({
          where: { assessmentId_studentId: { assessmentId: id, studentId } },
          update: { status: AssignmentStatus.ASSIGNED, dueAt: assessment.endAt },
          create: { assessmentId: id, studentId, dueAt: assessment.endAt },
        });
      }

      return tx.assessment.update({
        where: { id },
        data: { status: AssessmentStatus.ACTIVE },
        include: { _count: { select: { assignments: true } } },
      });
    });
  }

  async close(id: string) {
    await this.findOne(id);
    return this.prisma.assessment.update({
      where: { id },
      data: { status: AssessmentStatus.CLOSED },
    });
  }

  async getProgress(id: string) {
    await this.findOne(id);
    const grouped = await this.prisma.assessmentAssignment.groupBy({
      by: ["status"],
      where: { assessmentId: id },
      _count: { status: true },
    });
    return grouped.map((item) => ({ status: item.status, count: item._count.status }));
  }

  async getResults(id: string) {
    const assessment = await this.findOne(id);
    const attempts = await this.getSubmittedAttempts(id);
    const latestAttempts = this.pickLatestAttemptPerStudent(attempts);

    const results = latestAttempts.map((attempt) => {
      const competencyResults = attempt.competencyResults.map((result) => ({
        competencyId: result.competencyId,
        competencyCode: result.competency.code,
        competencyName: result.competency.name,
        score: Number(result.score),
        masteryStatus: result.masteryStatus,
      }));
      const lowestCompetency = [...competencyResults].sort((a, b) => a.score - b.score)[0] ?? null;

      return {
        attemptId: attempt.id,
        studentId: attempt.assignment.student.id,
        studentName: attempt.assignment.student.fullName,
        participantCode: attempt.assignment.student.participantCode ?? "-",
        classroom: attempt.assignment.student.classrooms[0]?.classroom
          ? {
              id: attempt.assignment.student.classrooms[0].classroom.id,
              name: attempt.assignment.student.classrooms[0].classroom.name,
              gradeLevel: attempt.assignment.student.classrooms[0].classroom.gradeLevel,
            }
          : null,
        submittedAt: attempt.submittedAt,
        totalScore: Number(attempt.totalScore ?? 0),
        correctAnswers: attempt.correctAnswers ?? 0,
        wrongAnswers: attempt.wrongAnswers ?? 0,
        unanswered: attempt.unanswered ?? 0,
        lowestCompetency,
        competencyResults,
        recommendations: attempt.recommendations.map((recommendation) => ({
          competencyId: recommendation.competencyId,
          competencyName: recommendation.competency.name,
          priority: recommendation.priority,
          title: recommendation.title,
          description: recommendation.description,
          recommendedDays: recommendation.recommendedDays,
        })),
      };
    });

    const averageScore = results.length
      ? Math.round(results.reduce((sum, result) => sum + result.totalScore, 0) / results.length)
      : 0;

    return {
      assessmentId: id,
      assessmentTitle: assessment.title,
      submittedCount: results.length,
      averageScore,
      results,
      note: results.length
        ? "Laporan membaca attempt submitted terakhir dari setiap siswa."
        : "Belum ada siswa yang submit asesmen ini.",
    };
  }

  async getHeatmap(id: string) {
    await this.findOne(id);
    const latestAttempts = this.pickLatestAttemptPerStudent(await this.getSubmittedAttempts(id));
    const grouped = new Map<
      string,
      {
        competencyId: string;
        competencyCode: string;
        competencyName: string;
        scores: number[];
        mastered: number;
        developing: number;
        needsPractice: number;
      }
    >();

    latestAttempts
      .flatMap((attempt) => attempt.competencyResults)
      .forEach((result) => {
        const existing =
          grouped.get(result.competencyId) ??
          {
            competencyId: result.competencyId,
            competencyCode: result.competency.code,
            competencyName: result.competency.name,
            scores: [],
            mastered: 0,
            developing: 0,
            needsPractice: 0,
          };
        existing.scores.push(Number(result.score));
        if (result.masteryStatus === "MASTERED") existing.mastered += 1;
        if (result.masteryStatus === "DEVELOPING") existing.developing += 1;
        if (result.masteryStatus === "NEEDS_PRACTICE") existing.needsPractice += 1;
        grouped.set(result.competencyId, existing);
      });

    const heatmap = [...grouped.values()]
      .map((item) => ({
        competencyId: item.competencyId,
        competencyCode: item.competencyCode,
        competencyName: item.competencyName,
        averageScore: item.scores.length
          ? Math.round(item.scores.reduce((sum, score) => sum + score, 0) / item.scores.length)
          : 0,
        totalStudents: item.scores.length,
        mastered: item.mastered,
        developing: item.developing,
        needsPractice: item.needsPractice,
      }))
      .sort((a, b) => a.averageScore - b.averageScore);

    return {
      assessmentId: id,
      heatmap,
      note: heatmap.length
        ? "Kompetensi diurutkan dari rata-rata terendah agar prioritas remedial jelas."
        : "Heatmap akan muncul setelah siswa submit asesmen.",
    };
  }

  async getRemedialGroups(id: string) {
    await this.findOne(id);
    const latestAttempts = this.pickLatestAttemptPerStudent(await this.getSubmittedAttempts(id));
    const grouped = new Map<
      string,
      {
        competencyId: string;
        competencyName: string;
        title: string;
        description: string;
        students: { id: string; name: string; participantCode: string; score: number }[];
      }
    >();

    latestAttempts.forEach((attempt) => {
      attempt.recommendations.forEach((recommendation) => {
        const competencyResult = attempt.competencyResults.find(
          (result) => result.competencyId === recommendation.competencyId,
        );
        const existing =
          grouped.get(recommendation.competencyId) ??
          {
            competencyId: recommendation.competencyId,
            competencyName: recommendation.competency.name,
            title: recommendation.title,
            description: recommendation.description,
            students: [],
          };
        existing.students.push({
          id: attempt.assignment.student.id,
          name: attempt.assignment.student.fullName,
          participantCode: attempt.assignment.student.participantCode ?? "-",
          score: Number(competencyResult?.score ?? attempt.totalScore ?? 0),
        });
        grouped.set(recommendation.competencyId, existing);
      });
    });

    const groups = [...grouped.values()]
      .map((group) => ({
        ...group,
        studentCount: group.students.length,
        averageScore: group.students.length
          ? Math.round(group.students.reduce((sum, student) => sum + student.score, 0) / group.students.length)
          : 0,
      }))
      .sort((a, b) => b.studentCount - a.studentCount || a.averageScore - b.averageScore);

    return {
      assessmentId: id,
      groups,
      note: groups.length
        ? "Kelompok remedial dibuat dari rekomendasi attempt terakhir setiap siswa."
        : "Belum ada rekomendasi remedial untuk asesmen ini.",
    };
  }

  async exportResults(id: string) {
    const [results, heatmap, remedialGroups] = await Promise.all([
      this.getResults(id),
      this.getHeatmap(id),
      this.getRemedialGroups(id),
    ]);

    return {
      assessmentId: id,
      generatedAt: new Date(),
      format: "json",
      results,
      heatmap,
      remedialGroups,
    };
  }

  private async getSubmittedAttempts(assessmentId: string) {
    return this.prisma.assessmentAttempt.findMany({
      where: {
        assignment: { assessmentId },
        status: { in: ["SUBMITTED", "AUTO_SUBMITTED"] },
      },
      include: {
        assignment: {
          include: {
            student: {
              include: {
                classrooms: {
                  where: { leftAt: null },
                  take: 1,
                  include: { classroom: { select: { id: true, name: true, gradeLevel: true } } },
                },
              },
            },
          },
        },
        competencyResults: {
          include: { competency: { select: { id: true, code: true, name: true } } },
          orderBy: { score: "asc" },
        },
        recommendations: {
          include: { competency: { select: { id: true, code: true, name: true } } },
          orderBy: { priority: "asc" },
        },
      },
      orderBy: [{ assignmentId: "asc" }, { attemptNumber: "desc" }],
    });
  }

  private pickLatestAttemptPerStudent<T extends { assignmentId: string; attemptNumber: number }>(
    attempts: T[],
  ) {
    const latestByAssignment = new Map<string, T>();
    attempts.forEach((attempt) => {
      const existing = latestByAssignment.get(attempt.assignmentId);
      if (!existing || attempt.attemptNumber > existing.attemptNumber) {
        latestByAssignment.set(attempt.assignmentId, attempt);
      }
    });
    return [...latestByAssignment.values()];
  }

  private async ensureSubjectExists(subjectId: string) {
    const subject = await this.prisma.subject.findUnique({ where: { id: subjectId } });
    if (!subject) throw new NotFoundException("Mata pelajaran tidak ditemukan.");
  }

  private async ensureSchoolExists(schoolId: string) {
    const school = await this.prisma.school.findFirst({ where: { id: schoolId, deletedAt: null } });
    if (!school) throw new NotFoundException("Sekolah tidak ditemukan.");
  }

  private async ensureSlugAvailable(subjectId: string, slug: string, ignoredId?: string) {
    const existing = await this.prisma.assessment.findUnique({
      where: { subjectId_slug: { subjectId, slug } },
    });
    if (existing && existing.id !== ignoredId) {
      throw new ConflictException("Slug asesmen sudah digunakan pada mata pelajaran ini.");
    }
  }
}
