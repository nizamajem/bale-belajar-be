import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { MissionStatus } from "@prisma/client";
import { AuthenticatedUser } from "../../common/types/authenticated-user.type";
import { PrismaService } from "../../database/prisma/prisma.service";

@Injectable()
export class StudentBaleVerseService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(currentUser: AuthenticatedUser) {
    const studentProfileId = this.getStudentProfileId(currentUser);
    const student = await this.prisma.studentProfile.findUnique({
      where: { id: studentProfileId },
      include: {
        onboarding: true,
        gameProfile: true,
        placementAttempts: {
          orderBy: { createdAt: "desc" },
          take: 1,
          include: { analysis: true },
        },
      },
    });
    if (!student) throw new NotFoundException("Profil siswa tidak ditemukan.");

    const selectedWorld = await this.resolveWorldKey(
      student.placementAttempts[0]?.analysis?.selectedWorld ??
        student.onboarding?.learningWorld,
    );

    const worlds = await this.prisma.world.findMany({
      where: {
        isActive: true,
        quests: { some: { status: MissionStatus.ACTIVE } },
        chapters: { some: {} },
      },
      include: {
        subject: { select: { name: true } },
        worldProgress: { where: { studentProfileId }, take: 1 },
        quests: {
          where: { status: MissionStatus.ACTIVE },
          orderBy: { code: "asc" },
          take: 6,
        },
        chapters: { orderBy: { chapterNumber: "asc" }, take: 8 },
      },
      orderBy: { orderNumber: "asc" },
    });
    if (worlds.length === 0) {
      throw new NotFoundException(
        "Data dunia belum tersedia. Jalankan import dan normalisasi kurikulum.",
      );
    }

    const selectedWorldData =
      worlds.find((world) => world.key === selectedWorld) ??
      worlds.find((world) => world.quests.length > 0) ??
      worlds[0];
    const activeQuest =
      selectedWorldData.quests[0] ?? worlds.flatMap((world) => world.quests)[0];
    const analysis = student.placementAttempts[0]?.analysis;

    return {
      profile: {
        name: student.fullName,
        rank: student.gameProfile
          ? this.rankForLevel(student.gameProfile.accountLevel)
          : "Pemula",
        level: student.gradeLevel ?? 10,
        foundation: analysis?.recommendedLevel ?? "FOUNDATION_1",
      },
      stats: {
        xp: student.gameProfile?.accountXp ?? 0,
        streak: student.gameProfile?.streakCurrent ?? 0,
        weeklyCompleted: Math.min(
          student.gameProfile?.streakCurrent ?? 0,
          student.gameProfile?.streakTargetPerWeek ?? 3,
        ),
        weeklyTarget: student.gameProfile?.streakTargetPerWeek ?? 3,
      },
      selectedWorld: selectedWorldData.key,
      todayMission: activeQuest
        ? this.questToMission(activeQuest)
        : await this.firstMission(selectedWorldData.key),
      worlds: worlds.map((world) => ({
        key: world.key,
        name: world.name,
        subject: world.subject.name,
        description: world.themeDescription ?? world.characterClass,
        exampleMission: world.quests[0]?.title ?? "Belum ada misi aktif",
        mastery: world.worldProgress[0]?.worldLevel ?? 1,
        unlocked: world.quests.length > 0,
      })),
      missions: selectedWorldData.quests.map((quest, index) => ({
        id: quest.id,
        worldKey: selectedWorldData.key,
        title: quest.title,
        description: quest.objective ?? quest.studentInstruction ?? quest.story ?? "",
        durationMinutes: quest.estimatedMinutes,
        rewardXp: quest.xpRewardFirst,
        active: index === 0,
      })),
      learningPath: selectedWorldData.chapters.map((chapter, index) => ({
        step: chapter.chapterNumber,
        title: chapter.title,
        completed: index === 0,
        active: index === 1,
        locked: index > 1,
        stars: index === 0 ? 3 : index === 1 ? 1 : 0,
      })),
    };
  }

  private async firstMission(worldKey: string) {
    const quest = await this.prisma.quest.findFirst({
      where: { status: MissionStatus.ACTIVE, world: { key: worldKey } },
      orderBy: { code: "asc" },
    });
    if (quest) return this.questToMission(quest);
    return {
      id: `first-${worldKey}`,
      worldKey,
      title: "Misi belum tersedia",
      durationMinutes: 0,
      activityCount: 0,
      rewardXp: 0,
    };
  }

  private questToMission(quest: {
    id: string;
    worldId?: string;
    title: string;
    estimatedMinutes: number;
    xpRewardFirst: number;
  }) {
    return {
      id: quest.id,
      title: quest.title,
      durationMinutes: quest.estimatedMinutes,
      activityCount: 5,
      rewardXp: quest.xpRewardFirst,
    };
  }

  private async resolveWorldKey(worldKey?: string | null) {
    const normalized = worldKey?.toLowerCase();
    const aliases: Record<string, string> = {
      sains: "scientia",
      science: "scientia",
      scientia: "scientia",
      try_all: "scientia",
      tryall: "scientia",
      numeria: "numeria",
      kodex: "kodex",
      detectivia: "detectivia",
      bahasa: "bahasa",
    };
    const candidate = normalized ? aliases[normalized] ?? normalized : undefined;
    if (candidate) {
      const existing = await this.prisma.world.findUnique({
        where: { key: candidate },
        select: { key: true, quests: { where: { status: MissionStatus.ACTIVE }, take: 1 } },
      });
      if (existing?.quests.length) return existing.key;
    }
    const firstWithQuest = await this.prisma.world.findFirst({
      where: { isActive: true, quests: { some: { status: MissionStatus.ACTIVE } } },
      orderBy: { orderNumber: "asc" },
      select: { key: true },
    });
    return firstWithQuest?.key ?? candidate ?? "scientia";
  }

  private rankForLevel(level: number) {
    if (level >= 20) return "Mentor Muda";
    if (level >= 10) return "Penjelajah";
    return "Pemula";
  }

  private getStudentProfileId(currentUser: AuthenticatedUser) {
    if (!currentUser.studentProfileId) {
      throw new ForbiddenException("Akses hanya untuk siswa.");
    }
    return currentUser.studentProfileId;
  }
}
