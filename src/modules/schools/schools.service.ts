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
import { CreateSchoolDto } from "./dto/create-school.dto";
import { UpdateSchoolDto } from "./dto/update-school.dto";

@Injectable()
export class SchoolsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: PaginationQueryDto) {
    const pagination = getPagination(query);
    const where: Prisma.SchoolWhereInput = {
      deletedAt: null,
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: "insensitive" } },
              { slug: { contains: query.search, mode: "insensitive" } },
              { city: { contains: query.search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [schools, total] = await this.prisma.$transaction([
      this.prisma.school.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: pagination.skip,
        take: pagination.take,
      }),
      this.prisma.school.count({ where }),
    ]);

    return {
      data: schools,
      meta: getPaginationMeta({
        page: pagination.page,
        limit: pagination.limit,
        total,
      }),
    };
  }

  async findOne(id: string) {
    const school = await this.prisma.school.findFirst({
      where: { id, deletedAt: null },
    });

    if (!school) {
      throw new NotFoundException("Sekolah tidak ditemukan.");
    }

    return school;
  }

  async create(dto: CreateSchoolDto) {
    await this.ensureSlugAvailable(dto.slug);

    return this.prisma.school.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        npsn: dto.npsn,
        address: dto.address,
        province: dto.province,
        city: dto.city,
        district: dto.district,
        contactName: dto.contactName,
        contactPhone: dto.contactPhone,
        contactEmail: dto.contactEmail,
        pilotStatus: dto.pilotStatus,
        isActive: dto.isActive,
      },
    });
  }

  async update(id: string, dto: UpdateSchoolDto) {
    await this.findOne(id);

    if (dto.slug) {
      await this.ensureSlugAvailable(dto.slug, id);
    }

    return this.prisma.school.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.school.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isActive: false,
      },
    });
  }

  async getStatistics(id: string) {
    await this.findOne(id);

    const [teachers, students, classrooms] = await this.prisma.$transaction([
      this.prisma.teacherProfile.count({ where: { schoolId: id } }),
      this.prisma.studentProfile.count({
        where: { schoolId: id, deletedAt: null },
      }),
      this.prisma.classroom.count({ where: { schoolId: id, isActive: true } }),
    ]);

    return {
      teachers,
      students,
      classrooms,
    };
  }

  private async ensureSlugAvailable(slug: string, ignoredId?: string) {
    const existing = await this.prisma.school.findUnique({
      where: { slug },
    });

    if (existing && existing.id !== ignoredId) {
      throw new ConflictException("Slug sekolah sudah digunakan.");
    }
  }
}

