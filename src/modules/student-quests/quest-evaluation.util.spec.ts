import { QuestQuestionForEvaluation, evaluateQuestAnswer } from "./quest-evaluation.util";

function baseQuestion(overrides: Partial<QuestQuestionForEvaluation> = {}): QuestQuestionForEvaluation {
  return {
    id: "q1",
    questionType: "SINGLE_CHOICE",
    scoringConfig: null,
    caseSensitive: null,
    inputMode: null,
    options: [],
    matchingPairs: [],
    orderItems: [],
    acceptedAnswers: [],
    hotspotAreas: [],
    evidenceItems: [],
    ...overrides,
  };
}

describe("evaluateQuestAnswer - choice-based types (single/binary/image/audio)", () => {
  const options = [
    { optionId: "A", isCorrect: false },
    { optionId: "B", isCorrect: true },
  ];

  it.each(["SINGLE_CHOICE", "BINARY_CHOICE", "IMAGE_CHOICE", "AUDIO_CHOICE"] as const)(
    "%s: scores 100 and AUTO_SCORED when the correct option is selected",
    (questionType) => {
      const question = baseQuestion({ questionType, options });
      const result = evaluateQuestAnswer(question, { selectedOptionId: "B" });
      expect(result.score).toBe(100);
      expect(result.isCorrect).toBe(true);
      expect(result.evaluationStatus).toBe("AUTO_SCORED");
    },
  );

  it("scores 0 when the wrong option is selected", () => {
    const question = baseQuestion({ options });
    const result = evaluateQuestAnswer(question, { selectedOptionId: "A" });
    expect(result.score).toBe(0);
    expect(result.isCorrect).toBe(false);
  });

  it("scores 0 and never throws when unanswered", () => {
    const question = baseQuestion({ options });
    const result = evaluateQuestAnswer(question, null);
    expect(result.score).toBe(0);
  });
});

describe("evaluateQuestAnswer - MULTIPLE_SELECT", () => {
  const options = [
    { optionId: "A", isCorrect: true },
    { optionId: "B", isCorrect: true },
    { optionId: "C", isCorrect: false },
  ];

  it("allCorrect: scores 100 only when the exact correct set is selected", () => {
    const question = baseQuestion({ questionType: "MULTIPLE_SELECT", scoringConfig: "allCorrect", options });
    expect(evaluateQuestAnswer(question, { selectedOptionIds: ["A", "B"] }).score).toBe(100);
    expect(evaluateQuestAnswer(question, { selectedOptionIds: ["A"] }).score).toBe(0);
    expect(evaluateQuestAnswer(question, { selectedOptionIds: ["A", "B", "C"] }).score).toBe(0);
  });

  it("partialCredit: scores proportionally to correct options matched", () => {
    const question = baseQuestion({ questionType: "MULTIPLE_SELECT", scoringConfig: "partialCredit", options });
    expect(evaluateQuestAnswer(question, { selectedOptionIds: ["A"] }).score).toBe(50);
  });

  it("penaltyForWrong: deducts for wrong picks", () => {
    const question = baseQuestion({ questionType: "MULTIPLE_SELECT", scoringConfig: "penaltyForWrong", options });
    // matched=2 (A,B), wrong=1 (C) -> (2-1)/2*100 = 50
    expect(evaluateQuestAnswer(question, { selectedOptionIds: ["A", "B", "C"] }).score).toBe(50);
  });
});

describe("evaluateQuestAnswer - SHORT_TEXT", () => {
  it("matches a normalized accepted answer, case-insensitive by default", () => {
    const question = baseQuestion({
      questionType: "SHORT_TEXT",
      acceptedAnswers: [{ answerText: "Kloroplas", normalizedAnswer: "kloroplas", toleranceNumeric: null }],
    });
    expect(evaluateQuestAnswer(question, { text: "  KLOROPLAS " }).score).toBe(100);
    expect(evaluateQuestAnswer(question, { text: "mitokondria" }).score).toBe(0);
  });

  it("matches numeric answers within tolerance when inputMode is numeric", () => {
    const question = baseQuestion({
      questionType: "SHORT_TEXT",
      inputMode: "numeric",
      acceptedAnswers: [{ answerText: "25", normalizedAnswer: "25", toleranceNumeric: 0.5 }],
    });
    expect(evaluateQuestAnswer(question, { text: "25.3" }).score).toBe(100);
    expect(evaluateQuestAnswer(question, { text: "30" }).score).toBe(0);
  });
});

describe("evaluateQuestAnswer - MATCHING", () => {
  it("scores proportionally to correctly matched pairs", () => {
    const question = baseQuestion({
      questionType: "MATCHING",
      matchingPairs: [
        { leftId: "L1", rightId: "R1" },
        { leftId: "L2", rightId: "R2" },
      ],
    });
    const result = evaluateQuestAnswer(question, { matches: { L1: "R1", L2: "RX" } });
    expect(result.score).toBe(50);
  });
});

describe("evaluateQuestAnswer - ORDERING and TIMELINE_BUILDER", () => {
  it.each(["ORDERING", "TIMELINE_BUILDER"] as const)("%s: scores by position-correct count", (questionType) => {
    const question = baseQuestion({
      questionType,
      orderItems: [
        { itemId: "I1", correctPosition: 1 },
        { itemId: "I2", correctPosition: 2 },
        { itemId: "I3", correctPosition: 3 },
      ],
    });
    const result = evaluateQuestAnswer(question, { order: ["I1", "I3", "I2"] });
    // only I1 is in its correct position
    expect(result.score).toBe(33);
  });
});

describe("evaluateQuestAnswer - IMAGE_HOTSPOT", () => {
  it("matches the selected hotspot to the correct one", () => {
    const question = baseQuestion({
      questionType: "IMAGE_HOTSPOT",
      hotspotAreas: [
        { hotspotId: "H1", isCorrect: true },
        { hotspotId: "H2", isCorrect: false },
      ],
    });
    expect(evaluateQuestAnswer(question, { selectedHotspotId: "H1" }).score).toBe(100);
    expect(evaluateQuestAnswer(question, { selectedHotspotId: "H2" }).score).toBe(0);
  });
});

describe("evaluateQuestAnswer - EVIDENCE_BOARD", () => {
  it("rewards matched correct evidence and penalizes wrong picks", () => {
    const question = baseQuestion({
      questionType: "EVIDENCE_BOARD",
      evidenceItems: [
        { evidenceId: "E1", isCorrectEvidence: true },
        { evidenceId: "E2", isCorrectEvidence: true },
        { evidenceId: "E3", isCorrectEvidence: false },
      ],
    });
    // matched=2, wrong=1 -> (2-1)/2*100 = 50
    const result = evaluateQuestAnswer(question, { selectedEvidenceIds: ["E1", "E2", "E3"] });
    expect(result.score).toBe(50);
  });
});

describe("evaluateQuestAnswer - MENTOR_REVIEW_NEEDED types (never auto-scored)", () => {
  it.each(["LONG_TEXT", "VOICE_RESPONSE", "CODE_INPUT"] as const)(
    "%s: always returns MENTOR_REVIEW_NEEDED with null score/isCorrect",
    (questionType) => {
      const question = baseQuestion({ questionType });
      const result = evaluateQuestAnswer(question, { text: "jawaban siswa", code: "print(1)" });
      expect(result.evaluationStatus).toBe("MENTOR_REVIEW_NEEDED");
      expect(result.score).toBeNull();
      expect(result.isCorrect).toBeNull();
    },
  );
});
