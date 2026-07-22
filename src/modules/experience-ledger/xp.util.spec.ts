import {
  getLevelForXp,
  getRankForLevel,
  getXpIntoCurrentLevel,
  XP_PER_LEVEL,
} from "./xp.util";

describe("xp.util", () => {
  describe("getLevelForXp", () => {
    it("starts at level 1 with zero xp", () => {
      expect(getLevelForXp(0)).toBe(1);
    });

    it("advances a level every XP_PER_LEVEL points", () => {
      expect(getLevelForXp(XP_PER_LEVEL - 1)).toBe(1);
      expect(getLevelForXp(XP_PER_LEVEL)).toBe(2);
      expect(getLevelForXp(XP_PER_LEVEL * 5)).toBe(6);
    });

    it("never returns a level below 1 for negative input", () => {
      expect(getLevelForXp(-50)).toBe(1);
    });
  });

  describe("getXpIntoCurrentLevel", () => {
    it("computes remainder within the current level", () => {
      expect(getXpIntoCurrentLevel(XP_PER_LEVEL + 25)).toBe(25);
    });
  });

  describe("getRankForLevel", () => {
    it.each([
      [1, "TUNAS"],
      [5, "TUNAS"],
      [6, "PERINTIS"],
      [15, "PERINTIS"],
      [16, "PENJELAJAH"],
      [30, "PENJELAJAH"],
      [31, "PAKAR"],
      [50, "PAKAR"],
      [51, "MAESTRO"],
      [75, "MAESTRO"],
      [76, "GUARDIAN"],
      [99, "GUARDIAN"],
      [100, "LEGENDA_BALE"],
      [250, "LEGENDA_BALE"],
    ])("maps level %i to rank %s", (level, expectedRank) => {
      expect(getRankForLevel(level)).toBe(expectedRank);
    });
  });
});
