import {
  computeMissionXpReward,
  evaluateMissionAnswers,
} from "./mission-evaluation.util";

const activities = [
  {
    id: "activity-1",
    options: [
      { id: "opt-1a", isCorrect: true },
      { id: "opt-1b", isCorrect: false },
    ],
  },
  {
    id: "activity-2",
    options: [
      { id: "opt-2a", isCorrect: false },
      { id: "opt-2b", isCorrect: true },
    ],
  },
];

describe("evaluateMissionAnswers", () => {
  it("marks an activity correct only when the selected option isCorrect", () => {
    const result = evaluateMissionAnswers(activities, [
      { activityId: "activity-1", selectedOptionId: "opt-1a" },
      { activityId: "activity-2", selectedOptionId: "opt-2a" },
    ]);

    expect(result.perActivity).toEqual([
      { activityId: "activity-1", selectedOptionId: "opt-1a", isCorrect: true },
      { activityId: "activity-2", selectedOptionId: "opt-2a", isCorrect: false },
    ]);
    expect(result.correctCount).toBe(1);
    expect(result.totalActivities).toBe(2);
  });

  it("treats unanswered activities as incorrect, never throwing", () => {
    const result = evaluateMissionAnswers(activities, [
      { activityId: "activity-1", selectedOptionId: null },
    ]);

    expect(result.perActivity[0]).toEqual({
      activityId: "activity-1",
      selectedOptionId: null,
      isCorrect: false,
    });
    expect(result.perActivity[1].isCorrect).toBe(false);
    expect(result.correctCount).toBe(0);
  });

  it("ignores a selectedOptionId that does not belong to the activity", () => {
    const result = evaluateMissionAnswers(
      [activities[0]],
      [{ activityId: "activity-1", selectedOptionId: "opt-2a" }],
    );

    expect(result.perActivity[0].isCorrect).toBe(false);
  });
});

describe("computeMissionXpReward", () => {
  it("awards a completion bonus plus per-correct-activity XP", () => {
    expect(computeMissionXpReward(0)).toBe(20);
    expect(computeMissionXpReward(3)).toBe(50);
  });
});
