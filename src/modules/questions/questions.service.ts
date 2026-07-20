import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, QuestionStatus } from "@prisma/client";
import { PaginationQueryDto } from "../../common/dto/pagination-query.dto";
import { getPagination, getPaginationMeta } from "../../common/utils/pagination.util";
import { PrismaService } from "../../database/prisma/prisma.service";
import { CreateQuestionDto } from "./dto/create-question.dto";
import { UpdateQuestionDto } from "./dto/update-question.dto";

@Injectable()
export class QuestionsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: PaginationQueryDto) {
    const pagination = getPagination(query);
    const where: Prisma.QuestionWhereInput = {
      deletedAt: null,
      ...(query.search
        ? {
            OR: [
              { code: { contains: query.search, mode: "insensitive" } },
              { questionText: { contains: query.search, mode: "insensitive" } },
              { competency: { name: { contains: query.search, mode: "insensitive" } } },
            ],
          }
        : {}),
    };

    const [questions, total] = await this.prisma.$transaction([
      this.prisma.question.findMany({
        where,
        include: {
          subject: { select: { id: true, code: true, name: true } },
          competency: { select: { id: true, code: true, name: true } },
          subCompetency: { select: { id: true, code: true, name: true } },
          options: { orderBy: { orderNumber: "asc" } },
        },
        orderBy: { createdAt: "desc" },
        skip: pagination.skip,
        take: pagination.take,
      }),
      this.prisma.question.count({ where }),
    ]);

    return {
      data: questions,
      meta: getPaginationMeta({ page: pagination.page, limit: pagination.limit, total }),
    };
  }

  async findOne(id: string) {
    const question = await this.prisma.question.findFirst({
      where: { id, deletedAt: null },
      include: {
        subject: { select: { id: true, code: true, name: true } },
        competency: { select: { id: true, code: true, name: true } },
        subCompetency: { select: { id: true, code: true, name: true } },
        options: { orderBy: { orderNumber: "asc" } },
      },
    });

    if (!question) {
      throw new NotFoundException("Soal tidak ditemukan.");
    }

    return question;
  }

  async create(dto: CreateQuestionDto) {
    this.validateOptions(dto.options);
    await this.ensureCodeAvailable(dto.code);
    await this.ensureQuestionRelations(dto);

    return this.prisma.question.create({
      data: {
        code: dto.code.trim().toUpperCase(),
        subjectId: dto.subjectId,
        competencyId: dto.competencyId,
        subCompetencyId: dto.subCompetencyId,
        gradeLevel: dto.gradeLevel,
        difficulty: dto.difficulty,
        type: dto.type,
        questionText: dto.questionText,
        explanation: dto.explanation,
        imageUrl: dto.imageUrl,
        weight: dto.weight,
        source: dto.source,
        status: dto.status,
        createdBy: dto.createdBy,
        options: {
          create: dto.options.map((option) => ({
            optionKey: option.optionKey.trim().toUpperCase(),
            optionText: option.optionText,
            imageUrl: option.imageUrl,
            isCorrect: option.isCorrect,
            orderNumber: option.orderNumber,
          })),
        },
      },
      include: { options: { orderBy: { orderNumber: "asc" } } },
    });
  }

  async update(id: string, dto: UpdateQuestionDto) {
    const existing = await this.findOne(id);
    if (dto.code) {
      await this.ensureCodeAvailable(dto.code, id);
    }

    await this.ensureQuestionRelations({
      subjectId: dto.subjectId ?? existing.subjectId,
      competencyId: dto.competencyId ?? existing.competencyId,
      subCompetencyId: dto.subCompetencyId ?? existing.subCompetencyId ?? undefined,
    });

    if (dto.options) {
      this.validateOptions(dto.options);
    }

    return this.prisma.$transaction(async (tx) => {
      if (dto.options) {
        await tx.questionOption.deleteMany({ where: { questionId: id } });
      }

      return tx.question.update({
        where: { id },
        data: {
          code: dto.code?.trim().toUpperCase(),
          subjectId: dto.subjectId,
          competencyId: dto.competencyId,
          subCompetencyId: dto.subCompetencyId,
          gradeLevel: dto.gradeLevel,
          difficulty: dto.difficulty,
          type: dto.type,
          questionText: dto.questionText,
          explanation: dto.explanation,
          imageUrl: dto.imageUrl,
          weight: dto.weight,
          source: dto.source,
          status: dto.status,
          createdBy: dto.createdBy,
          options: dto.options
            ? {
                create: dto.options.map((option) => ({
                  optionKey: option.optionKey.trim().toUpperCase(),
                  optionText: option.optionText,
                  imageUrl: option.imageUrl,
                  isCorrect: option.isCorrect,
                  orderNumber: option.orderNumber,
                })),
              }
            : undefined,
        },
        include: { options: { orderBy: { orderNumber: "asc" } } },
      });
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.question.update({
      where: { id },
      data: { deletedAt: new Date(), status: QuestionStatus.ARCHIVED },
    });
  }

  async activate(id: string) {
    const question = await this.findOne(id);
    this.validateOptions(question.options);

    return this.prisma.question.update({
      where: { id },
      data: { status: QuestionStatus.ACTIVE },
    });
  }

  private validateOptions(options: { optionKey: string; isCorrect: boolean }[]) {
    if (options.length < 2) {
      throw new BadRequestException("Soal pilihan ganda minimal memiliki dua opsi.");
    }

    const keys = new Set(options.map((option) => option.optionKey.trim().toUpperCase()));
    if (keys.size !== options.length) {
      throw new BadRequestException("Option key tidak boleh duplikat.");
    }

    if (!options.some((option) => option.isCorrect)) {
      throw new BadRequestException("Minimal satu opsi harus menjadi jawaban benar.");
    }
  }

  private async ensureCodeAvailable(code: string, ignoredId?: string) {
    const existing = await this.prisma.question.findUnique({
      where: { code: code.trim().toUpperCase() },
    });

    if (existing && existing.id !== ignoredId) {
      throw new ConflictException("Kode soal sudah digunakan.");
    }
  }

  private async ensureQuestionRelations(dto: {
    subjectId: string;
    competencyId: string;
    subCompetencyId?: string;
  }) {
    const competency = await this.prisma.competency.findUnique({
      where: { id: dto.competencyId },
    });

    if (!competency || competency.subjectId !== dto.subjectId) {
      throw new BadRequestException("Kompetensi tidak sesuai dengan mata pelajaran.");
    }

    if (dto.subCompetencyId) {
      const subCompetency = await this.prisma.subCompetency.findUnique({
        where: { id: dto.subCompetencyId },
      });

      if (!subCompetency || subCompetency.competencyId !== dto.competencyId) {
        throw new BadRequestException("Subkompetensi tidak sesuai dengan kompetensi.");
      }
    }
  }
}

