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
import { CreateStudentDto } from "./dto/create-student.dto";
import { UpdateStudentDto } from "./dto/update-student.dto";

@Injectable()
export class StudentsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: PaginationQueryDto) {
    const pagination = getPagination(query);
    const where: Prisma.StudentProfileWhereInput = {
      deletedAt: null,
      ...(query.search
        ? {
            OR: [
              { fullName: { contains: query.search, mode: "insensitive" } },
              {
                participantCode: {
                  contains: query.search,
                  mode: "insensitive",
                },
              },
              { studentNumber: { contains: query.search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [students, total] = await this.prisma.$transaction([
      this.prisma.studentProfile.findMany({
        where,
        include: {
          school: {
            select: { id: true, name: true, slug: true },
          },
          classrooms: {
            where: { leftAt: null },
            include: {
              classroom: {
                select: { id: true, name: true, gradeLevel: true },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: pagination.skip,
        take: pagination.take,
      }),
      this.prisma.studentProfile.count({ where }),
    ]);

    return {
      data: students,
      meta: getPaginationMeta({
        page: pagination.page,
        limit: pagination.limit,
        total,
      }),
    };
  }

  async findOne(id: string) {
    const student = await this.prisma.studentProfile.findFirst({
      where: { id, deletedAt: null },
      include: {
        school: { select: { id: true, name: true, slug: true } },
        classrooms: {
          include: {
            classroom: true,
          },
        },
      },
    });

    if (!student) {
      throw new NotFoundException("Siswa tidak ditemukan.");
    }

    return student;
  }

  async create(dto: CreateStudentDto) {
    await this.ensureSchoolExists(dto.schoolId);
    await this.ensureParticipantCodeAvailable(dto.participantCode);

    return this.prisma.studentProfile.create({
      data: {
        schoolId: dto.schoolId,
        participantCode: dto.participantCode.trim().toUpperCase(),
        studentNumber: dto.studentNumber,
        fullName: dto.fullName,
        phone: dto.phone,
        gender: dto.gender,
        birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
        academicYear: dto.academicYear,
        isActive: dto.isActive,
      },
    });
  }

  async update(id: string, dto: UpdateStudentDto) {
    await this.findOne(id);

    if (dto.schoolId) {
      await this.ensureSchoolExists(dto.schoolId);
    }

    if (dto.participantCode) {
      await this.ensureParticipantCodeAvailable(dto.participantCode, id);
    }

    return this.prisma.studentProfile.update({
      where: { id },
      data: {
        schoolId: dto.schoolId,
        participantCode: dto.participantCode?.trim().toUpperCase(),
        studentNumber: dto.studentNumber,
        fullName: dto.fullName,
        phone: dto.phone,
        gender: dto.gender,
        birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
        academicYear: dto.academicYear,
        isActive: dto.isActive,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.studentProfile.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isActive: false,
      },
    });
  }

  async getAssessmentHistory(id: string) {
    await this.findOne(id);

    return {
      studentId: id,
      assessments: [],
      note: "Assessment history akan aktif setelah assessment engine dibuat.",
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

  private async ensureParticipantCodeAvailable(code: string, ignoredId?: string) {
    const existing = await this.prisma.studentProfile.findUnique({
      where: { participantCode: code.trim().toUpperCase() },
    });

    if (existing && existing.id !== ignoredId) {
      throw new ConflictException("Kode peserta sudah digunakan.");
    }
  }
}

