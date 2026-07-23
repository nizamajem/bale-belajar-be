import {
  computeCaseXpReward,
  computeOverallScore,
  evaluateCaseAnswer,
} from "./case-evaluation.util";

describe("evaluateCaseAnswer", () => {
  const question = {
    id: "q1",
    expectedKeywords: ["jadwal", "login", "waktu"],
  };

  it("scores 100 when all expected keywords are present", () => {
    const result = evaluateCaseAnswer(question, {
      questionId: "q1",
      answerText: "Berdasarkan jadwal dan catatan login, waktu kejadian bisa diverifikasi.",
    });

    expect(result.score).toBe(100);
    expect(result.matchedKeywords).toEqual(["jadwal", "login", "waktu"]);
    expect(result.missingKeywords).toEqual([]);
  });

  it("scores partially when only some keywords are present", () => {
    const result = evaluateCaseAnswer(question, {
      questionId: "q1",
      answerText: "Aku lihat dari jadwal saja.",
    });

    expect(result.score).toBe(33);
    expect(result.matchedKeywords).toEqual(["jadwal"]);
    expect(result.missingKeywords).toEqual(["login", "waktu"]);
  });

  it("scores 0 for an empty or unanswered question, never throwing", () => {
    const result = evaluateCaseAnswer(question, { questionId: "q1", answerText: null });

    expect(result.score).toBe(0);
    expect(result.matchedKeywords).toEqual([]);
  });

  it("is case-insensitive", () => {
    const result = evaluateCaseAnswer(question, {
      questionId: "q1",
      answerText: "JADWAL dan LOGIN dan WAKTU semua ada.",
    });

    expect(result.score).toBe(100);
  });
});

describe("computeOverallScore", () => {
  it("averages scores across questions", () => {
    expect(computeOverallScore([{ score: 100 }, { score: 50 }, { score: 0 }])).toBe(50);
  });

  it("returns 0 for no questions", () => {
    expect(computeOverallScore([])).toBe(0);
  });
});

describe("computeCaseXpReward", () => {
  it("awards completion bonus plus per-strong-answer XP", () => {
    expect(computeCaseXpReward([{ score: 80 }, { score: 30 }, { score: 100 }])).toBe(
      25 + 15 * 2,
    );
  });

  it("awards only the completion bonus when no answer is strong", () => {
    expect(computeCaseXpReward([{ score: 10 }, { score: 20 }])).toBe(25);
  });
});
