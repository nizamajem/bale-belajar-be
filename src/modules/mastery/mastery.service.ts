import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { AuthenticatedUser } from "../../common/types/authenticated-user.type";
import { PrismaService } from "../../database/prisma/prisma.service";
import {
  computeNextMasteryScore,
  getConfidenceLevel,
  getMasteryStatus,
  SCORING_VERSION,
} from "./mastery.util";

export type RecordEvidenceInput = {
  studentProfileId: string;
  competencyId: string;
  isCorrect: boolean;
  sourceType: string;
  sourceId: string;
};

@Injectable()
export class MasteryService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Mengevaluasi satu bukti (jawaban aktivitas) secara deterministik dan
   * menyimpan snapshot bertingkat (MasteryEvent) agar setiap perubahan
   * mastery bisa ditelusuri. Tidak ada pemanggilan AI di sini.
   */
  async recordEvidence(
    client: Prisma.TransactionClient,
    input: RecordEvidenceInput,
  ) {
    const previous = await client.masteryState.upsert({
      where: {
        studentProfileId_competencyId: {
          studentProfileId: input.studentProfileId,
          competencyId: input.competencyId,
        },
      },
      update: {},
      create: {
        studentProfileId: input.studentProfileId,
        competencyId: input.competencyId,
      },
    });

    const nextScore = computeNextMasteryScore(
      Number(previous.masteryScore),
      previous.evidenceCount,
      input.isCorrect,
    );
    const nextEvidenceCount = previous.evidenceCount + 1;
    const nextStatus = getMasteryStatus(nextScore, nextEvidenceCount);
    const nextConfidence = getConfidenceLevel(nextEvidenceCount);

    const updated = await client.masteryState.update({
      where: { id: previous.id },
      data: {
        masteryScore: nextScore,
        evidenceCount: nextEvidenceCount,
        status: nextStatus,
        confidence: nextConfidence,
        scoringVersion: SCORING_VERSION,
        lastEvaluatedAt: new Date(),
      },
    });

    await client.masteryEvent.create({
      data: {
        masteryStateId: updated.id,
        studentProfileId: input.studentProfileId,
        competencyId: input.competencyId,
        scoreDelta: nextScore - Number(previous.masteryScore),
        newScore: nextScore,
        newStatus: nextStatus,
        confidence: nextConfidence,
        scoringVersion: SCORING_VERSION,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
      },
    });

    return updated;
  }

  async getGrowthMapForStudent(
    currentUser: AuthenticatedUser,
    worldKey: string,
  ) {
    const studentProfileId = this.getStudentProfileId(currentUser);

    const world = await this.prisma.world.findUnique({
      where: { key: worldKey },
    });

    if (!world) {
      throw new NotFoundException("Dunia tidak ditemukan.");
    }

    const competencies = await this.prisma.competency.findMany({
      where: { subjectId: world.subjectId, isActive: true },
      include: {
        masteryStates: {
          where: { studentProfileId },
        },
      },
      orderBy: { orderNumber: "asc" },
    });

    return competencies.map((competency) => {
      const state = competency.masteryStates[0];

      return {
        competencyId: competency.id,
        competencyName: competency.name,
        masteryScore: state ? Number(state.masteryScore) : 0,
        status: state?.status ?? "INSUFFICIENT_EVIDENCE",
        confidence: state?.confidence ?? "LOW",
        evidenceCount: state?.evidenceCount ?? 0,
        lastEvaluatedAt: state?.lastEvaluatedAt ?? null,
      };
    });
  }

  private getStudentProfileId(currentUser: AuthenticatedUser) {
    if (!currentUser.studentProfileId) {
      throw new ForbiddenException("Akses hanya untuk siswa.");
    }

    return currentUser.studentProfileId;
  }
}
