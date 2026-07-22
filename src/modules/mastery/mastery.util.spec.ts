import { ConfidenceLevel, LearningMasteryStatus } from "@prisma/client";
import {
  computeNextMasteryScore,
  getConfidenceLevel,
  getMasteryStatus,
} from "./mastery.util";

describe("mastery.util", () => {
  describe("computeNextMasteryScore", () => {
    it("sets score to 100 on the first correct evidence", () => {
      expect(computeNextMasteryScore(0, 0, true)).toBe(100);
    });

    it("sets score to 0 on the first incorrect evidence", () => {
      expect(computeNextMasteryScore(0, 0, false)).toBe(0);
    });

    it("averages subsequent evidence proportionally", () => {
      // previous: 1 correct (score 100), now 1 incorrect -> average of [100, 0] = 50
      expect(computeNextMasteryScore(100, 1, false)).toBe(50);
    });
  });

  describe("getMasteryStatus", () => {
    it("returns INSUFFICIENT_EVIDENCE below the evidence threshold regardless of score", () => {
      expect(getMasteryStatus(100, 0)).toBe(
        LearningMasteryStatus.INSUFFICIENT_EVIDENCE,
      );
      expect(getMasteryStatus(100, 2)).toBe(
        LearningMasteryStatus.INSUFFICIENT_EVIDENCE,
      );
    });

    it("classifies MASTERED/DEVELOPING/NEEDS_PRACTICE once evidence is sufficient", () => {
      expect(getMasteryStatus(85, 3)).toBe(LearningMasteryStatus.MASTERED);
      expect(getMasteryStatus(65, 3)).toBe(LearningMasteryStatus.DEVELOPING);
      expect(getMasteryStatus(40, 3)).toBe(
        LearningMasteryStatus.NEEDS_PRACTICE,
      );
    });
  });

  describe("getConfidenceLevel", () => {
    it("scales confidence with evidence count", () => {
      expect(getConfidenceLevel(0)).toBe(ConfidenceLevel.LOW);
      expect(getConfidenceLevel(3)).toBe(ConfidenceLevel.MEDIUM);
      expect(getConfidenceLevel(6)).toBe(ConfidenceLevel.HIGH);
    });
  });
});
