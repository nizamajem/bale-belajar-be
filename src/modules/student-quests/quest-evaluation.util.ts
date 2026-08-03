// Nilai string sengaja didefinisikan ulang di sini (bukan `import type
// { QuestQuestionType } from "@prisma/client"`) supaya file ini tetap murni
// tanpa dependency apa pun ke Prisma/Nest - ikuti pola case-evaluation.util.ts
// yang juga tidak menyentuh model Prisma sama sekali. Value-nya harus tetap
// sinkron manual dengan enum QuestQuestionType di schema.prisma.
export type QuestQuestionTypeValue =
  | "SINGLE_CHOICE"
  | "MULTIPLE_SELECT"
  | "BINARY_CHOICE"
  | "SHORT_TEXT"
  | "MATCHING"
  | "ORDERING"
  | "IMAGE_CHOICE"
  | "AUDIO_CHOICE"
  | "LONG_TEXT"
  | "CODE_INPUT"
  | "IMAGE_HOTSPOT"
  | "VOICE_RESPONSE"
  | "TIMELINE_BUILDER"
  | "EVIDENCE_BOARD";

export type QuestOptionForEvaluation = { optionId: string; isCorrect: boolean };
export type QuestMatchingPairForEvaluation = { leftId: string; rightId: string };
export type QuestOrderItemForEvaluation = { itemId: string; correctPosition: number };
export type QuestAcceptedAnswerForEvaluation = {
  answerText: string;
  normalizedAnswer: string | null;
  toleranceNumeric: number | null;
};
export type QuestHotspotAreaForEvaluation = { hotspotId: string; isCorrect: boolean };
export type QuestEvidenceItemForEvaluation = { evidenceId: string; isCorrectEvidence: boolean };

export type QuestQuestionForEvaluation = {
  id: string;
  questionType: QuestQuestionTypeValue;
  scoringConfig: string | null;
  caseSensitive: boolean | null;
  inputMode: string | null;
  options: QuestOptionForEvaluation[];
  matchingPairs: QuestMatchingPairForEvaluation[];
  orderItems: QuestOrderItemForEvaluation[];
  acceptedAnswers: QuestAcceptedAnswerForEvaluation[];
  hotspotAreas: QuestHotspotAreaForEvaluation[];
  evidenceItems: QuestEvidenceItemForEvaluation[];
};

// Bentuk payload jawaban siswa berbeda-beda per tipe soal - lihat komentar
// per tipe di evaluateQuestAnswer(). Semua field opsional karena payload
// datang dari luar (belum tentu lengkap saat baru di-autosave).
export type QuestAnswerPayload = {
  selectedOptionId?: string;
  selectedOptionIds?: string[];
  text?: string;
  matches?: Record<string, string>;
  order?: string[];
  selectedHotspotId?: string;
  selectedEvidenceIds?: string[];
  code?: string;
};

export type QuestAnswerEvaluationResult = {
  questionId: string;
  score: number | null;
  isCorrect: boolean | null;
  evaluationStatus: "AUTO_SCORED" | "MENTOR_REVIEW_NEEDED";
  detail: Record<string, unknown>;
};

export const QUEST_STRONG_ANSWER_THRESHOLD = 60;

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function normalizeText(value: string, caseSensitive: boolean | null): string {
  const trimmed = value.trim();
  return caseSensitive ? trimmed : trimmed.toLowerCase();
}

function autoScored(questionId: string, score: number, detail: Record<string, unknown>): QuestAnswerEvaluationResult {
  return {
    questionId,
    score,
    isCorrect: score >= QUEST_STRONG_ANSWER_THRESHOLD,
    evaluationStatus: "AUTO_SCORED",
    detail,
  };
}

function mentorReviewNeeded(questionId: string, detail: Record<string, unknown>): QuestAnswerEvaluationResult {
  return { questionId, score: null, isCorrect: null, evaluationStatus: "MENTOR_REVIEW_NEEDED", detail };
}

function evaluateSingleCorrectOption(
  question: QuestQuestionForEvaluation,
  selectedOptionId: string | undefined,
): QuestAnswerEvaluationResult {
  const correctOption = question.options.find((o) => o.isCorrect);
  const isMatch = Boolean(selectedOptionId) && selectedOptionId === correctOption?.optionId;
  return autoScored(question.id, isMatch ? 100 : 0, {
    selectedOptionId: selectedOptionId ?? null,
    correctOptionId: correctOption?.optionId ?? null,
  });
}

function evaluateMultipleSelect(
  question: QuestQuestionForEvaluation,
  selectedOptionIds: string[],
): QuestAnswerEvaluationResult {
  const correctIds = question.options.filter((o) => o.isCorrect).map((o) => o.optionId);
  const selectedSet = new Set(selectedOptionIds);
  const matched = correctIds.filter((id) => selectedSet.has(id));
  const wrong = selectedOptionIds.filter((id) => !correctIds.includes(id));

  let score: number;
  switch (question.scoringConfig) {
    case "partialCredit":
      score = correctIds.length === 0 ? 0 : (matched.length / correctIds.length) * 100;
      break;
    case "penaltyForWrong":
      score = correctIds.length === 0 ? 0 : ((matched.length - wrong.length) / correctIds.length) * 100;
      break;
    case "allCorrect":
    default:
      score = matched.length === correctIds.length && wrong.length === 0 ? 100 : 0;
      break;
  }

  return autoScored(question.id, clampScore(score), {
    selectedOptionIds,
    correctOptionIds: correctIds,
    matchedCount: matched.length,
    wrongCount: wrong.length,
    scoringConfig: question.scoringConfig ?? "allCorrect",
  });
}

function evaluateShortText(question: QuestQuestionForEvaluation, text: string | undefined): QuestAnswerEvaluationResult {
  const submitted = normalizeText(text ?? "", question.caseSensitive);
  const isNumeric = question.inputMode === "numeric" || question.inputMode === "decimal";

  const matched = question.acceptedAnswers.some((accepted) => {
    if (isNumeric) {
      const submittedNumber = Number(submitted.replace(",", "."));
      const acceptedNumber = Number((accepted.normalizedAnswer ?? accepted.answerText).replace(",", "."));
      if (Number.isNaN(submittedNumber) || Number.isNaN(acceptedNumber)) return false;
      const tolerance = accepted.toleranceNumeric ?? 0;
      return Math.abs(submittedNumber - acceptedNumber) <= tolerance;
    }
    const candidate = normalizeText(accepted.normalizedAnswer ?? accepted.answerText, question.caseSensitive);
    return candidate === submitted;
  });

  return autoScored(question.id, matched ? 100 : 0, { submittedText: text ?? "" });
}

function evaluateMatching(question: QuestQuestionForEvaluation, matches: Record<string, string>): QuestAnswerEvaluationResult {
  const total = question.matchingPairs.length;
  if (total === 0) return autoScored(question.id, 0, { reason: "no matching pairs configured" });
  const correctCount = question.matchingPairs.filter((pair) => matches[pair.leftId] === pair.rightId).length;
  return autoScored(question.id, clampScore((correctCount / total) * 100), { correctCount, total });
}

function evaluateOrdering(question: QuestQuestionForEvaluation, order: string[]): QuestAnswerEvaluationResult {
  const total = question.orderItems.length;
  if (total === 0) return autoScored(question.id, 0, { reason: "no order items configured" });
  const correctPositionByItemId = new Map(question.orderItems.map((item) => [item.itemId, item.correctPosition]));
  let correctCount = 0;
  order.forEach((itemId, index) => {
    if (correctPositionByItemId.get(itemId) === index + 1) correctCount += 1;
  });
  return autoScored(question.id, clampScore((correctCount / total) * 100), { correctCount, total });
}

function evaluateImageHotspot(
  question: QuestQuestionForEvaluation,
  selectedHotspotId: string | undefined,
): QuestAnswerEvaluationResult {
  const correctHotspot = question.hotspotAreas.find((h) => h.isCorrect);
  const isMatch = Boolean(selectedHotspotId) && selectedHotspotId === correctHotspot?.hotspotId;
  return autoScored(question.id, isMatch ? 100 : 0, {
    selectedHotspotId: selectedHotspotId ?? null,
    correctHotspotId: correctHotspot?.hotspotId ?? null,
  });
}

function evaluateEvidenceBoard(question: QuestQuestionForEvaluation, selectedEvidenceIds: string[]): QuestAnswerEvaluationResult {
  const correctIds = question.evidenceItems.filter((e) => e.isCorrectEvidence).map((e) => e.evidenceId);
  const selectedSet = new Set(selectedEvidenceIds);
  const matched = correctIds.filter((id) => selectedSet.has(id));
  const wrong = selectedEvidenceIds.filter((id) => !correctIds.includes(id));
  const score = correctIds.length === 0 ? 0 : ((matched.length - wrong.length) / correctIds.length) * 100;
  return autoScored(question.id, clampScore(score), {
    selectedEvidenceIds,
    correctEvidenceIds: correctIds,
    matchedCount: matched.length,
    wrongCount: wrong.length,
  });
}

/**
 * Dispatcher evaluasi deterministik per tipe soal. codeInput/longText/
 * voiceResponse SENGAJA selalu MENTOR_REVIEW_NEEDED - eksekusi kode butuh
 * sandbox terpisah (isu keamanan), longText/voiceResponse rubriknya
 * kualitatif (bukan keyword list) sehingga tidak layak diskor otomatis.
 * Tidak ada AI di jalur ini sama sekali, sesuai prinsip evaluasi
 * deterministik CLAUDE.md.
 */
export function evaluateQuestAnswer(
  question: QuestQuestionForEvaluation,
  payload: QuestAnswerPayload | null,
): QuestAnswerEvaluationResult {
  const p = payload ?? {};

  switch (question.questionType) {
    case "SINGLE_CHOICE":
    case "BINARY_CHOICE":
    case "IMAGE_CHOICE":
    case "AUDIO_CHOICE":
      return evaluateSingleCorrectOption(question, p.selectedOptionId);
    case "MULTIPLE_SELECT":
      return evaluateMultipleSelect(question, p.selectedOptionIds ?? []);
    case "SHORT_TEXT":
      return evaluateShortText(question, p.text);
    case "MATCHING":
      return evaluateMatching(question, p.matches ?? {});
    case "ORDERING":
    case "TIMELINE_BUILDER":
      return evaluateOrdering(question, p.order ?? []);
    case "IMAGE_HOTSPOT":
      return evaluateImageHotspot(question, p.selectedHotspotId);
    case "EVIDENCE_BOARD":
      return evaluateEvidenceBoard(question, p.selectedEvidenceIds ?? []);
    case "LONG_TEXT":
    case "VOICE_RESPONSE":
      return mentorReviewNeeded(question.id, { submittedText: p.text ?? null });
    case "CODE_INPUT":
      return mentorReviewNeeded(question.id, { submittedCode: p.code ?? null });
    default:
      return mentorReviewNeeded(question.id, { reason: `unknown question type ${String(question.questionType)}` });
  }
}
