export function koreanMockMode(missionType: string | null | undefined): 'PBT' | 'IBT' | null {
  return missionType === 'TOPIK_MOCK_PBT' ? 'PBT' : missionType === 'TOPIK_MOCK_IBT' ? 'IBT' : null;
}
export function koreanExamDeadline(missionType: string | null | undefined, startedAt?: Date | null): Date | null {
  const mode = koreanMockMode(missionType);
  return mode && startedAt ? new Date(startedAt.getTime() + (mode === 'PBT' ? 180 : 125) * 60_000) : null;
}
type ScoredQuestion = { id: string; scoringConfig: string | null };
type Score = { questionId: string; score: number | null };
export function summarizeKoreanExam(missionType: string | null | undefined, questions: ScoredQuestion[], answers: Score[]) {
  const mode = koreanMockMode(missionType);
  if (!mode) return null;
  const byQuestion = new Map(answers.map(answer => [answer.questionId, answer.score]));
  const sections = ['listening', 'reading', 'writing'].map(section => {
    const items = questions.map(question => ({ question, config: JSON.parse(question.scoringConfig ?? '{}') as { section: string; points: number } }))
      .filter(item => item.config.section === section);
    const pending = items.some(item => byQuestion.get(item.question.id) === null);
    const maxPoints = items.reduce((sum, item) => sum + item.config.points, 0);
    const earned = items.reduce((sum, item) => sum + (byQuestion.get(item.question.id) ?? 0) * item.config.points / 100, 0);
    return { section, questionCount: items.length, reviewPending: pending,
      score: pending ? null : Math.round(earned / maxPoints * 10000) / 100 };
  });
  const pending = sections.some(section => section.reviewPending);
  const overallScore = pending ? null : Math.round(sections.reduce((sum, section) => sum + section.score!, 0) / 3 * 100) / 100;
  return { mode, sections, overallScore, reviewPending: pending,
    pbtPracticePoints: mode === 'PBT' && overallScore !== null ? Math.round(sections.reduce((sum, section) => sum + section.score!, 0) * 100) / 100 : null,
    scoreMeaning: 'Original practice content; not an official score or calibrated prediction. IBT practice percentages are not converted to the official 600-point scale.' };
}
