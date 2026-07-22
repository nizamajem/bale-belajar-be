export const XP_PER_LEVEL = 100;

export type BaleRank =
  | "TUNAS"
  | "PERINTIS"
  | "PENJELAJAH"
  | "PAKAR"
  | "MAESTRO"
  | "GUARDIAN"
  | "LEGENDA_BALE";

/**
 * Level dihitung murni dari total XP (tidak disimpan sebagai kolom terpisah
 * di tempat lain) supaya level dan XP tidak pernah desync.
 */
export function getLevelForXp(totalXp: number): number {
  return Math.floor(Math.max(totalXp, 0) / XP_PER_LEVEL) + 1;
}

export function getXpIntoCurrentLevel(totalXp: number): number {
  return Math.max(totalXp, 0) % XP_PER_LEVEL;
}

export function getXpRequiredForNextLevel(): number {
  return XP_PER_LEVEL;
}

/**
 * Rank (blueprint §4.3) diturunkan dari accountLevel, bukan field tersimpan,
 * supaya rank tidak pernah bisa berbeda dari level yang sebenarnya.
 */
export function getRankForLevel(level: number): BaleRank {
  if (level >= 100) return "LEGENDA_BALE";
  if (level >= 76) return "GUARDIAN";
  if (level >= 51) return "MAESTRO";
  if (level >= 31) return "PAKAR";
  if (level >= 16) return "PENJELAJAH";
  if (level >= 6) return "PERINTIS";
  return "TUNAS";
}
