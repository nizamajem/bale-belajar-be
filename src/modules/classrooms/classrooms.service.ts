import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PaginationQueryDto } from "../../common/dto/pagination-query.dto";
import {
  getPagination,
  getPaginationMeta,
} from "../../common/utils/pagination.util";
import { PrismaService } from "../../database/prisma/prisma.service";
import { AddClassroomStudentDto } from "./dto/add-classroom-student.dto";
import { CreateClassroomDto } from "./dto/create-classroom.dto";
import { UpdateClassroomDto } from "./dto/update-classroom.dto";

@Injectable()
export class ClassroomsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: PaginationQueryDto) {
    const pagination = getPagination(query);
    const where: Prisma.ClassroomWhereInput = {
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: "insensitive" } },
              { academicYear: { contains: query.search, mode: "insensitive" } },
              { school: { name: { contains: query.search, mode: "insensitive" } } },
            ],
          }
        : {}),
    };

    const [classrooms, total] = await this.prisma.$transaction([
      this.prisma.classroom.findMany({
        where,
        include: {
          school: { select: { id: true, name: true, slug: true } },
          homeroomTeacher: {
            select: {
              id: true,
              user: { select: { id: true, name: true, email: true } },
            },
          },
          _count: {
            select: { students: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: pagination.skip,
        take: pagination.take,
      }),
      this.prisma.classroom.count({ where }),
    ]);

    return {
      data: classrooms,
      meta: getPaginationMeta({
        page: pagination.page,
        limit: pagination.limit,
        total,
      }),
    };
  }

  async findOne(id: string) {
    const classroom = await this.prisma.classroom.findUnique({
      where: { id },
      include: {
        school: { select: { id: true, name: true, slug: true } },
        homeroomTeacher: {
          select: {
            id: true,
            user: { select: { id: true, name: true, email: true } },
          },
        },
        students: {
          where: { leftAt: null },
          include: {
            student: true,
          },
          orderBy: { joinedAt: "asc" },
        },
      },
    });

    if (!classroom) {
      throw new NotFoundException("Kelas tidak ditemukan.");
    }

    return classroom;
  }

  async create(dto: CreateClassroomDto) {
    await this.ensureSchoolExists(dto.schoolId);
    await this.ensureTeacherExists(dto.homeroomTeacherId);
    await this.ensureClassroomUnique(dto.schoolId, dto.name, dto.academicYear);

    return this.prisma.classroom.create({
      data: {
        schoolId: dto.schoolId,
        name: dto.name,
        gradeLevel: dto.gradeLevel,
        academicYear: dto.academicYear,
        homeroomTeacherId: dto.homeroomTeacherId,
        isActive: dto.isActive,
      },
    });
  }

  async update(id: string, dto: UpdateClassroomDto) {
    const existing = await this.findOne(id);
    const schoolId = dto.schoolId ?? existing.schoolId;
    const name = dto.name ?? existing.name;
    const academicYear = dto.academicYear ?? existing.academicYear;

    if (dto.schoolId) {
      await this.ensureSchoolExists(dto.schoolId);
    }

    await this.ensureTeacherExists(dto.homeroomTeacherId);
    await this.ensureClassroomUnique(schoolId, name, academicYear, id);

    return this.prisma.classroom.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.classroom.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async addStudent(classroomId: string, dto: AddClassroomStudentDto) {
    const classroom = await this.findOne(classroomId);
    const student = await this.prisma.studentProfile.findFirst({
      where: { id: dto.studentId, deletedAt: null, isActive: true },
    });

    if (!student) {
      throw new NotFoundException("Siswa tidak ditemukan.");
    }

    if (student.schoolId !== classroom.schoolId) {
      throw new ConflictException("Siswa dan kelas harus berada di sekolah yang sama.");
    }

    return this.prisma.classroomStudent.upsert({
      where: {
        classroomId_studentId: {
          classroomId,
          studentId: dto.studentId,
        },
      },
      update: {
        leftAt: null,
      },
      create: {
        classroomId,
        studentId: dto.studentId,
      },
    });
  }

  async removeStudent(classroomId: string, studentId: string) {
    await this.findOne(classroomId);

    const relation = await this.prisma.classroomStudent.findUnique({
      where: {
        classroomId_studentId: {
          classroomId,
          studentId,
        },
      },
    });

    if (!relation || relation.leftAt) {
      throw new NotFoundException("Siswa tidak ditemukan di kelas ini.");
    }

    return this.prisma.classroomStudent.update({
      where: { id: relation.id },
      data: { leftAt: new Date() },
    });
  }

  async getStatistics(id: string) {
    await this.findOne(id);

    const [activeStudents, inactiveStudents] = await this.prisma.$transaction([
      this.prisma.classroomStudent.count({
        where: { classroomId: id, leftAt: null },
      }),
      this.prisma.classroomStudent.count({
        where: { classroomId: id, leftAt: { not: null } },
      }),
    ]);

    return {
      activeStudents,
      inactiveStudents,
      assessments: 0,
      completedAttempts: 0,
    };
  }

  private async ensureSchoolExists(schoolId: string) {
    const school = await this.prisma.school.findFirst({
      where: { id: schoolId, deletedAt: null },
    });

    if (!school) {
      throw new NotFoundException("Sekolah tidak ditemukan.");
    }
  }

  private async ensureTeacherExists(teacherId?: string) {
    if (!teacherId) {
      return;
    }

    const teacher = await this.prisma.teacherProfile.findUnique({
      where: { id: teacherId },
    });

    if (!teacher) {
      throw new NotFoundException("Guru tidak ditemukan.");
    }
  }

  private async ensureClassroomUnique(
    schoolId: string,
    name: string,
    academicYear: string,
    ignoredId?: string,
  ) {
    const existing = await this.prisma.classroom.findUnique({
      where: {
        schoolId_name_academicYear: {
          schoolId,
          name,
          academicYear,
        },
      },
    });

    if (existing && existing.id !== ignoredId) {
      throw new ConflictException("Kelas pada tahun ajaran tersebut sudah ada.");
    }
  }
}

