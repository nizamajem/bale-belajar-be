import { Injectable } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { PaginationQueryDto } from "../../common/dto/pagination-query.dto";
import {
  getPagination,
  getPaginationMeta,
} from "../../common/utils/pagination.util";
import { PrismaService } from "../../database/prisma/prisma.service";

type UsersQuery = PaginationQueryDto & {
  role?: "STUDENT" | "TEACHER" | "PARENT";
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
    const where = {
      deletedAt: null,
      ...(role ? { role } : {}),
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
}
