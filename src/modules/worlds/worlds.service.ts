import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { AuthenticatedUser } from "../../common/types/authenticated-user.type";
import { PrismaService } from "../../database/prisma/prisma.service";

type CurriculumModuleInput = {
  bigIdea?: string;
  estimatedMinutes?: number;
  orderNumber?: number;
  simpleGoal?: string;
  slug?: string;
  title?: string;
};

@Injectable()
export class WorldsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllForStudent(currentUser: AuthenticatedUser) {
    const studentProfileId = this.getStudentProfileId(currentUser);

    const worlds = await this.prisma.world.findMany({
      where: { isActive: true },
      include: {
        subject: { select: { id: true, code: true, name: true } },
        worldProgress: {
          where: { studentProfileId },
          select: { worldLevel: true, worldXp: true },
        },
      },
      orderBy: { orderNumber: "asc" },
    });

    return worlds.map((world) => ({
      id: world.id,
      key: world.key,
      name: world.name,
      characterClass: world.characterClass,
      themeDescription: world.themeDescription,
      subject: world.subject,
      worldLevel: world.worldProgress[0]?.worldLevel ?? 1,
      worldXp: world.worldProgress[0]?.worldXp ?? 0,
    }));
  }

  async findByKeyOrThrow(worldKey: string) {
    const world = await this.prisma.world.findUnique({
      where: { key: worldKey },
    });

    if (!world || !world.isActive) {
      return null;
    }

    return world;
  }

  async findCurriculumByWorldKey(worldKey: string) {
    const world = await this.prisma.world.findUnique({
      where: { key: worldKey },
      include: {
        subject: { select: { id: true, code: true, name: true } },
        curriculumModules: {
          where: { status: "ACTIVE" },
          orderBy: { orderNumber: "asc" },
          include: {
            competency: { select: { id: true, code: true, name: true } },
            lessons: { orderBy: { orderNumber: "asc" } },
            caseStudies: { orderBy: { orderNumber: "asc" } },
            remedialRules: {
              include: { competency: { select: { id: true, code: true, name: true } } },
            },
          },
        },
      },
    });

    if (!world || !world.isActive) {
      throw new NotFoundException("Dunia tidak ditemukan.");
    }

    return {
      id: world.id,
      key: world.key,
      name: world.name,
      characterClass: world.characterClass,
      themeDescription: world.themeDescription,
      subject: world.subject,
      modules: world.curriculumModules.map((module) => ({
        id: module.id,
        slug: module.slug,
        title: module.title,
        simpleGoal: module.simpleGoal,
        bigIdea: module.bigIdea,
        orderNumber: module.orderNumber,
        estimatedMinutes: module.estimatedMinutes,
        competency: module.competency,
        lessons: module.lessons.map((lesson) => ({
          id: lesson.id,
          type: lesson.type,
          title: lesson.title,
          body: lesson.body,
          examples: lesson.examples,
          items: lesson.items,
          orderNumber: lesson.orderNumber,
        })),
        caseStudies: module.caseStudies.map((caseStudy) => ({
          id: caseStudy.id,
          title: caseStudy.title,
          story: caseStudy.story,
          analysisSteps: caseStudy.analysisSteps,
          commonMistake: caseStudy.commonMistake,
          orderNumber: caseStudy.orderNumber,
        })),
        remedialRules: module.remedialRules.map((rule) => ({
          id: rule.id,
          minScoreExclusive: rule.minScoreExclusive,
          recommendationTitle: rule.recommendationTitle,
          recommendationMessage: rule.recommendationMessage,
          actionType: rule.actionType,
          competency: rule.competency,
        })),
      })),
    };
  }

  async createCurriculumModule(worldKey: string, input: CurriculumModuleInput) {
    const world = await this.prisma.world.findUnique({ where: { key: worldKey } });
    if (!world || !world.isActive) {
      throw new NotFoundException("Dunia tidak ditemukan.");
    }

    const orderNumber =
      input.orderNumber ??
      ((await this.prisma.curriculumModule.count({ where: { worldId: world.id } })) + 1);
    const title = input.title?.trim() || "Modul Baru";

    return this.prisma.curriculumModule.create({
      data: {
        worldId: world.id,
        slug: input.slug?.trim() || title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        title,
        simpleGoal: input.simpleGoal?.trim() || "Tujuan modul belum diisi.",
        bigIdea: input.bigIdea,
        orderNumber,
        estimatedMinutes: input.estimatedMinutes ?? 20,
        status: "DRAFT",
      },
    });
  }

  async updateCurriculumModule(moduleId: string, input: CurriculumModuleInput) {
    return this.prisma.curriculumModule.update({
      where: { id: moduleId },
      data: {
        bigIdea: input.bigIdea,
        estimatedMinutes: input.estimatedMinutes,
        orderNumber: input.orderNumber,
        simpleGoal: input.simpleGoal,
        slug: input.slug,
        title: input.title,
      },
    });
  }

  private getStudentProfileId(currentUser: AuthenticatedUser) {
    if (!currentUser.studentProfileId) {
      throw new ForbiddenException("Akses hanya untuk siswa.");
    }

    return currentUser.studentProfileId;
  }
}
