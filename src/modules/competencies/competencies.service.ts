import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PaginationQueryDto } from "../../common/dto/pagination-query.dto";
import { getPagination, getPaginationMeta } from "../../common/utils/pagination.util";
import { PrismaService } from "../../database/prisma/prisma.service";
import { AddPrerequisiteDto } from "./dto/add-prerequisite.dto";
import { CreateCompetencyDto } from "./dto/create-competency.dto";
import { UpdateCompetencyDto } from "./dto/update-competency.dto";

@Injectable()
export class CompetenciesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: PaginationQueryDto) {
    const pagination = getPagination(query);
    const where: Prisma.CompetencyWhereInput = query.search
      ? {
          OR: [
            { code: { contains: query.search, mode: "insensitive" } },
            { name: { contains: query.search, mode: "insensitive" } },
            { subject: { name: { contains: query.search, mode: "insensitive" } } },
          ],
        }
      : {};

    const [competencies, total] = await this.prisma.$transaction([
      this.prisma.competency.findMany({
        where,
        include: {
          subject: { select: { id: true, code: true, name: true } },
          subCompetencies: { orderBy: { orderNumber: "asc" } },
          _count: { select: { questions: true } },
        },
        orderBy: [{ gradeLevel: "asc" }, { orderNumber: "asc" }],
        skip: pagination.skip,
        take: pagination.take,
      }),
      this.prisma.competency.count({ where }),
    ]);

    return {
      data: competencies,
      meta: getPaginationMeta({ page: pagination.page, limit: pagination.limit, total }),
    };
  }

  async findOne(id: string) {
    const competency = await this.prisma.competency.findUnique({
      where: { id },
      include: {
        subject: { select: { id: true, code: true, name: true } },
        subCompetencies: { orderBy: { orderNumber: "asc" } },
        prerequisites: {
          include: {
            prerequisiteCompetency: {
              select: { id: true, code: true, name: true },
            },
          },
        },
        requiredBy: {
          include: {
            competency: { select: { id: true, code: true, name: true } },
          },
        },
      },
    });

    if (!competency) {
      throw new NotFoundException("Kompetensi tidak ditemukan.");
    }

    return competency;
  }

  async create(dto: CreateCompetencyDto) {
    await this.ensureSubjectExists(dto.subjectId);
    await this.ensureCodeAvailable(dto.subjectId, dto.code);

    return this.prisma.competency.create({
      data: {
        subjectId: dto.subjectId,
        code: dto.code.trim().toUpperCase(),
        name: dto.name,
        description: dto.description,
        gradeLevel: dto.gradeLevel,
        orderNumber: dto.orderNumber,
        isActive: dto.isActive,
        subCompetencies: dto.subCompetencies
          ? {
              create: dto.subCompetencies.map((item) => ({
                code: item.code.trim().toUpperCase(),
                name: item.name,
                description: item.description,
                orderNumber: item.orderNumber,
                isActive: item.isActive,
              })),
            }
          : undefined,
      },
      include: { subCompetencies: true },
    });
  }

  async update(id: string, dto: UpdateCompetencyDto) {
    const existing = await this.findOne(id);
    const subjectId = dto.subjectId ?? existing.subjectId;
    const code = dto.code ?? existing.code;

    if (dto.subjectId) {
      await this.ensureSubjectExists(dto.subjectId);
    }

    await this.ensureCodeAvailable(subjectId, code, id);

    return this.prisma.competency.update({
      where: { id },
      data: {
        subjectId: dto.subjectId,
        code: dto.code?.trim().toUpperCase(),
        name: dto.name,
        description: dto.description,
        gradeLevel: dto.gradeLevel,
        orderNumber: dto.orderNumber,
        isActive: dto.isActive,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.competency.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async addPrerequisite(id: string, dto: AddPrerequisiteDto) {
    await this.findOne(id);
    await this.findOne(dto.prerequisiteCompetencyId);

    if (id === dto.prerequisiteCompetencyId) {
      throw new ConflictException("Kompetensi tidak boleh menjadi prerequisite dirinya sendiri.");
    }

    return this.prisma.competencyPrerequisite.upsert({
      where: {
        competencyId_prerequisiteCompetencyId: {
          competencyId: id,
          prerequisiteCompetencyId: dto.prerequisiteCompetencyId,
        },
      },
      update: {},
      create: {
        competencyId: id,
        prerequisiteCompetencyId: dto.prerequisiteCompetencyId,
      },
    });
  }

  private async ensureSubjectExists(subjectId: string) {
    const subject = await this.prisma.subject.findUnique({ where: { id: subjectId } });
    if (!subject) {
      throw new NotFoundException("Mata pelajaran tidak ditemukan.");
    }
  }

  private async ensureCodeAvailable(subjectId: string, code: string, ignoredId?: string) {
    const existing = await this.prisma.competency.findUnique({
      where: {
        subjectId_code: {
          subjectId,
          code: code.trim().toUpperCase(),
        },
      },
    });

    if (existing && existing.id !== ignoredId) {
      throw new ConflictException("Kode kompetensi sudah digunakan pada mata pelajaran ini.");
    }
  }
}

