export type CaseQuestionForEvaluation = {
  id: string;
  expectedKeywords: string[];
};

export type CaseAnswerForEvaluation = {
  questionId: string;
  answerText: string | null;
};

export type CaseAnswerEvaluationResult = {
  questionId: string;
  score: number;
  matchedKeywords: string[];
  missingKeywords: string[];
};

/**
 * Penilaian keyword-coverage deterministik: proporsi kata kunci kunci
 * jawaban (expectedKeywords) yang disebut siswa di jawabannya sendiri.
 * Ini BUKAN evaluasi AI - murni pencocokan teks, disiapkan sebagai dasar
 * yang bisa diganti evaluator AI nanti tanpa mengubah kontrak data.
 */
export function evaluateCaseAnswer(
  question: CaseQuestionForEvaluation,
  answer: CaseAnswerForEvaluation,
): CaseAnswerEvaluationResult {
  const text = (answer.answerText ?? "").toLowerCase();
  const matchedKeywords: string[] = [];
  const missingKeywords: string[] = [];

  for (const keyword of question.expectedKeywords) {
    if (text.includes(keyword.toLowerCase())) {
      matchedKeywords.push(keyword);
    } else {
      missingKeywords.push(keyword);
    }
  }

  const score =
    question.expectedKeywords.length > 0
      ? Math.round((matchedKeywords.length / question.expectedKeywords.length) * 100)
      : 0;

  return { questionId: question.id, score, matchedKeywords, missingKeywords };
}

export function computeOverallScore(results: { score: number }[]): number {
  if (results.length === 0) return 0;
  const total = results.reduce((sum, result) => sum + result.score, 0);
  return Math.round(total / results.length);
}

export const CASE_XP_COMPLETION_BONUS = 25;
export const CASE_XP_PER_STRONG_ANSWER = 15;
export const STRONG_ANSWER_THRESHOLD = 60;

export function computeCaseXpReward(results: { score: number }[]): number {
  const strongAnswers = results.filter(
    (result) => result.score >= STRONG_ANSWER_THRESHOLD,
  ).length;
  return CASE_XP_COMPLETION_BONUS + strongAnswers * CASE_XP_PER_STRONG_ANSWER;
}
