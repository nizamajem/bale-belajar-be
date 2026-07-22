export type ActivityForEvaluation = {
  id: string;
  options: { id: string; isCorrect: boolean }[];
};

export type AnswerForEvaluation = {
  activityId: string;
  selectedOptionId: string | null;
};

export type ActivityEvaluationResult = {
  activityId: string;
  selectedOptionId: string | null;
  isCorrect: boolean;
};

export type MissionEvaluationResult = {
  perActivity: ActivityEvaluationResult[];
  correctCount: number;
  totalActivities: number;
};

/**
 * Evaluasi 100% deterministik berbasis data server (opsi mana yang isCorrect).
 * Tidak ada AI yang dilibatkan menentukan benar/salah di sini — ini murni
 * perbandingan data, memenuhi syarat "AI tidak boleh jadi satu-satunya
 * penentu skor akademik".
 */
export function evaluateMissionAnswers(
  activities: ActivityForEvaluation[],
  answers: AnswerForEvaluation[],
): MissionEvaluationResult {
  const answersByActivityId = new Map(
    answers.map((answer) => [answer.activityId, answer]),
  );

  const perActivity = activities.map((activity) => {
    const answer = answersByActivityId.get(activity.id);
    const selectedOptionId = answer?.selectedOptionId ?? null;
    const selectedOption = activity.options.find(
      (option) => option.id === selectedOptionId,
    );

    return {
      activityId: activity.id,
      selectedOptionId,
      isCorrect: Boolean(selectedOption?.isCorrect),
    };
  });

  const correctCount = perActivity.filter((item) => item.isCorrect).length;

  return {
    perActivity,
    correctCount,
    totalActivities: activities.length,
  };
}

export const XP_PER_CORRECT_ACTIVITY = 10;
export const XP_MISSION_COMPLETION_BONUS = 20;

export function computeMissionXpReward(correctCount: number): number {
  return correctCount * XP_PER_CORRECT_ACTIVITY + XP_MISSION_COMPLETION_BONUS;
}
