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
}
