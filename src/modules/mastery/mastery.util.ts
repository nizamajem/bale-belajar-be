import { ConfidenceLevel, LearningMasteryStatus } from "@prisma/client";

export const SCORING_VERSION = 1;
export const MIN_EVIDENCE_FOR_STATUS = 3;
export const MIN_EVIDENCE_FOR_HIGH_CONFIDENCE = 6;
export const MIN_EVIDENCE_FOR_MEDIUM_CONFIDENCE = 3;

/**
 * Running average sederhana dan deterministik: setiap bukti baru (benar=100,
 * salah=0) menggeser skor sesuai bobot jumlah bukti yang sudah ada. Ini
 * murni aturan/matematika — tidak ada model AI yang menentukan angka ini.
 */
export function computeNextMasteryScore(
  previousScore: number,
  previousEvidenceCount: number,
  isCorrect: boolean,
): number {
  const evidenceValue = isCorrect ? 100 : 0;
  const nextScore =
    (previousScore * previousEvidenceCount + evidenceValue) /
    (previousEvidenceCount + 1);

  return Math.round(nextScore * 100) / 100;
}

export function getMasteryStatus(
  score: number,
  evidenceCount: number,
): LearningMasteryStatus {
  if (evidenceCount < MIN_EVIDENCE_FOR_STATUS) {
    return LearningMasteryStatus.INSUFFICIENT_EVIDENCE;
  }
  if (score >= 80) {
    return LearningMasteryStatus.MASTERED;
  }
  if (score >= 60) {
    return LearningMasteryStatus.DEVELOPING;
  }
  return LearningMasteryStatus.NEEDS_PRACTICE;
}

export function getConfidenceLevel(evidenceCount: number): ConfidenceLevel {
  if (evidenceCount >= MIN_EVIDENCE_FOR_HIGH_CONFIDENCE) {
    return ConfidenceLevel.HIGH;
  }
  if (evidenceCount >= MIN_EVIDENCE_FOR_MEDIUM_CONFIDENCE) {
    return ConfidenceLevel.MEDIUM;
  }
  return ConfidenceLevel.LOW;
}
