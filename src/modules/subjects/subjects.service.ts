import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PaginationQueryDto } from "../../common/dto/pagination-query.dto";
import { getPagination, getPaginationMeta } from "../../common/utils/pagination.util";
import { PrismaService } from "../../database/prisma/prisma.service";
import { CreateSubjectDto } from "./dto/create-subject.dto";
import { UpdateSubjectDto } from "./dto/update-subject.dto";

@Injectable()
export class SubjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: PaginationQueryDto) {
    const pagination = getPagination(query);
    const where: Prisma.SubjectWhereInput = query.search
      ? {
          OR: [
            { code: { contains: query.search, mode: "insensitive" } },
            { name: { contains: query.search, mode: "insensitive" } },
          ],
        }
      : {};

    const [subjects, total] = await this.prisma.$transaction([
      this.prisma.subject.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: pagination.skip,
        take: pagination.take,
      }),
      this.prisma.subject.count({ where }),
    ]);

    return {
      data: subjects,
      meta: getPaginationMeta({ page: pagination.page, limit: pagination.limit, total }),
    };
  }

  async findOne(id: string) {
    const subject = await this.prisma.subject.findUnique({
      where: { id },
      include: {
        _count: {
          select: { competencies: true, questions: true },
        },
      },
    });

    if (!subject) {
      throw new NotFoundException("Mata pelajaran tidak ditemukan.");
    }

    return subject;
  }

  async create(dto: CreateSubjectDto) {
    await this.ensureCodeAvailable(dto.code);

    return this.prisma.subject.create({
      data: {
        code: dto.code.trim().toUpperCase(),
        name: dto.name,
        description: dto.description,
        isActive: dto.isActive,
      },
    });
  }

  async update(id: string, dto: UpdateSubjectDto) {
    await this.findOne(id);

    if (dto.code) {
      await this.ensureCodeAvailable(dto.code, id);
    }

    return this.prisma.subject.update({
      where: { id },
      data: {
        code: dto.code?.trim().toUpperCase(),
        name: dto.name,
        description: dto.description,
        isActive: dto.isActive,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.subject.update({
      where: { id },
      data: { isActive: false },
    });
  }

  private async ensureCodeAvailable(code: string, ignoredId?: string) {
    const existing = await this.prisma.subject.findUnique({
      where: { code: code.trim().toUpperCase() },
    });

    if (existing && existing.id !== ignoredId) {
      throw new ConflictException("Kode mata pelajaran sudah digunakan.");
    }
  }
}

