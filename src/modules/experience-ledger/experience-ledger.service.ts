import { Injectable } from "@nestjs/common";
import { Prisma, XpReason } from "@prisma/client";
import { PrismaService } from "../../database/prisma/prisma.service";
import {
  getLevelForXp,
  getRankForLevel,
  getXpIntoCurrentLevel,
  getXpRequiredForNextLevel,
} from "./xp.util";

export type AppendXpInput = {
  studentProfileId: string;
  worldId?: string;
  amount: number;
  reason: XpReason;
  sourceType: string;
  sourceId?: string;
};

export type AppendXpResult = {
  accountLevel: number;
  accountXp: number;
  accountLeveledUp: boolean;
  worldLevel?: number;
  worldXp?: number;
  worldLeveledUp?: boolean;
};

@Injectable()
export class ExperienceLedgerService {
  constructor(private readonly prisma: PrismaService) {}

  async ensureGameProfile(
    client: Prisma.TransactionClient,
    studentProfileId: string,
  ) {
    return client.studentGameProfile.upsert({
      where: { studentProfileId },
      update: {},
      create: { studentProfileId },
    });
  }

  async appendXp(
    client: Prisma.TransactionClient,
    input: AppendXpInput,
  ): Promise<AppendXpResult> {
    await client.experienceLedgerEntry.create({
      data: {
        studentProfileId: input.studentProfileId,
        worldId: input.worldId,
        amount: input.amount,
        reason: input.reason,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
      },
    });

    const previousProfile = await this.ensureGameProfile(
      client,
      input.studentProfileId,
    );
    const previousAccountLevel = getLevelForXp(previousProfile.accountXp);
    const nextAccountXp = previousProfile.accountXp + input.amount;
    const nextAccountLevel = getLevelForXp(nextAccountXp);

    await client.studentGameProfile.update({
      where: { studentProfileId: input.studentProfileId },
      data: {
        accountXp: nextAccountXp,
        accountLevel: nextAccountLevel,
      },
    });

    const result: AppendXpResult = {
      accountLevel: nextAccountLevel,
      accountXp: nextAccountXp,
      accountLeveledUp: nextAccountLevel > previousAccountLevel,
    };

    if (input.worldId) {
      const previousWorldProgress = await client.studentWorldProgress.upsert({
        where: {
          studentProfileId_worldId: {
            studentProfileId: input.studentProfileId,
            worldId: input.worldId,
          },
        },
        update: {},
        create: {
          studentProfileId: input.studentProfileId,
          worldId: input.worldId,
        },
      });

      const previousWorldLevel = getLevelForXp(previousWorldProgress.worldXp);
      const nextWorldXp = previousWorldProgress.worldXp + input.amount;
      const nextWorldLevel = getLevelForXp(nextWorldXp);

      await client.studentWorldProgress.update({
        where: {
          studentProfileId_worldId: {
            studentProfileId: input.studentProfileId,
            worldId: input.worldId,
          },
        },
        data: {
          worldXp: nextWorldXp,
          worldLevel: nextWorldLevel,
        },
      });

      result.worldXp = nextWorldXp;
      result.worldLevel = nextWorldLevel;
      result.worldLeveledUp = nextWorldLevel > previousWorldLevel;
    }

    return result;
  }

  /**
   * Nyala Belajar (streak) fleksibel: bertambah jika aktivitas hari ini
   * melanjutkan dari hari kemarin, direset ke 1 jika ada hari yang terlewat,
   * dan tidak berubah jika sudah tercatat aktif hari ini.
   */
  async registerDailyActivity(
    client: Prisma.TransactionClient,
    studentProfileId: string,
  ) {
    const profile = await this.ensureGameProfile(client, studentProfileId);
    const today = startOfDay(new Date());
    const lastActivityDay = profile.lastActivityDate
      ? startOfDay(profile.lastActivityDate)
      : null;

    let streakCurrent = profile.streakCurrent;

    if (!lastActivityDay) {
      streakCurrent = 1;
    } else {
      const dayDiff = Math.round(
        (today.getTime() - lastActivityDay.getTime()) / (1000 * 60 * 60 * 24),
      );

      if (dayDiff === 0) {
        streakCurrent = profile.streakCurrent;
      } else if (dayDiff === 1) {
        streakCurrent = profile.streakCurrent + 1;
      } else {
        streakCurrent = 1;
      }
    }

    const streakLongest = Math.max(profile.streakLongest, streakCurrent);

    return client.studentGameProfile.update({
      where: { studentProfileId },
      data: {
        streakCurrent,
        streakLongest,
        lastActivityDate: today,
      },
    });
  }

  async getGameProfileSummary(studentProfileId: string) {
    const profile = await this.ensureGameProfile(this.prisma, studentProfileId);

    return {
      accountLevel: profile.accountLevel,
      accountXp: profile.accountXp,
      xpIntoCurrentLevel: getXpIntoCurrentLevel(profile.accountXp),
      xpRequiredForNextLevel: getXpRequiredForNextLevel(),
      rank: getRankForLevel(profile.accountLevel),
      dayaBale: profile.dayaBale,
      streakCurrent: profile.streakCurrent,
      streakLongest: profile.streakLongest,
      streakTargetPerWeek: profile.streakTargetPerWeek,
      lastActivityDate: profile.lastActivityDate,
    };
  }
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}
