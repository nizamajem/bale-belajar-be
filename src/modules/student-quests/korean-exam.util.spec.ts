import { koreanExamDeadline, summarizeKoreanExam } from './korean-exam.util';

describe('Korean mock exam timing and section scoring', () => {
  const started = new Date('2026-10-10T01:00:00.000Z');
  it('keeps distinct absolute deadlines for PBT and IBT', () => {
    expect(koreanExamDeadline('TOPIK_MOCK_PBT', started)?.toISOString()).toBe('2026-10-10T04:00:00.000Z');
    expect(koreanExamDeadline('TOPIK_MOCK_IBT', started)?.toISOString()).toBe('2026-10-10T03:05:00.000Z');
    expect(koreanExamDeadline('KOREAN_LESSON', started)).toBeNull();
  });
  const questions = [
    { id: 'l', scoringConfig: JSON.stringify({ section: 'listening', points: 100 }) },
    { id: 'r', scoringConfig: JSON.stringify({ section: 'reading', points: 100 }) },
    { id: 'w1', scoringConfig: JSON.stringify({ section: 'writing', points: 10 }) },
    { id: 'w2', scoringConfig: JSON.stringify({ section: 'writing', points: 90 }) },
  ];
  it('weights writing tasks and sections instead of averaging all question counts', () => {
    const result = summarizeKoreanExam('TOPIK_MOCK_PBT', questions, [
      { questionId: 'l', score: 100 }, { questionId: 'r', score: 100 }, { questionId: 'w1', score: 0 }, { questionId: 'w2', score: 100 },
    ]);
    expect(result?.sections.find(s => s.section === 'writing')?.score).toBe(90);
    expect(result?.overallScore).toBe(96.67);
  });
  it('keeps total provisional until every writing review is complete', () => {
    const result = summarizeKoreanExam('TOPIK_MOCK_PBT', questions, [
      { questionId: 'l', score: 100 }, { questionId: 'r', score: 100 }, { questionId: 'w1', score: null }, { questionId: 'w2', score: 100 },
    ]);
    expect(result?.overallScore).toBeNull();
    expect(result?.sections.find(s => s.section === 'listening')?.score).toBe(100);
  });
  it('does not convert the IBT practice percentage into an official score', () => {
    const result = summarizeKoreanExam('TOPIK_MOCK_IBT', questions, questions.map(q => ({ questionId: q.id, score: 100 })));
    expect(result?.overallScore).toBe(100);
    expect(result?.pbtPracticePoints).toBeNull();
  });
  it('scores unanswered questions as zero', () => {
    expect(summarizeKoreanExam('TOPIK_MOCK_PBT', questions, [])?.overallScore).toBe(0);
  });
});
