import { StudentQuestsService } from './student-quests.service';
import { availableKoreanQuests, optionalKoreanQuest } from './korean-progression.util';

describe('Korean lesson progression', () => {
  function setup(scores: Array<{ id: string; score: number | null }> = []) {
    const quests = ['L02', 'L01', 'L03'].map(code => ({ id: code, code: `KOR-KO00-U01-${code}`,
      chapter: { chapterNumber: 1, competencies: [{ id: 'current-skill' }] }, _count: { questions: 10 } }));
    const prisma = {
      world: { findUnique: jest.fn().mockResolvedValue({ key: 'korean-learning' }) },
      quest: { findMany: jest.fn().mockResolvedValue(quests) },
      questAssignment: { findMany: jest.fn().mockResolvedValue(scores.map(s => ({ questId: s.id, attempt: { overallScore: s.score } }))) },
    };
    const service = new StudentQuestsService(prisma as never, {} as never, {} as never);
    const picker = service as unknown as { pickQuestForToday: (world: string, exclude?: string[], competency?: string, student?: string) => Promise<{ id: string }> };
    return { picker, prisma };
  }
  it('orders lessons by content code rather than database creation order', async () => {
    expect((await setup().picker.pickQuestForToday('world', undefined, undefined, 'student')).id).toBe('L01');
  });
  it('requires 75 and retries the failed lesson even when excluded today', async () => {
    expect((await setup([{ id: 'L01', score: 70 }]).picker.pickQuestForToday('world', ['L01'], undefined, 'student')).id).toBe('L01');
  });
  it('unlocks the next lesson after passing', async () => {
    expect((await setup([{ id: 'L01', score: 75 }]).picker.pickQuestForToday('world', undefined, undefined, 'student')).id).toBe('L02');
  });
  it('does not treat unscored attempts as mastery', async () => {
    expect((await setup([{ id: 'L01', score: null }]).picker.pickQuestForToday('world', undefined, undefined, 'student')).id).toBe('L01');
  });
  it('rejects a request that tries to skip ahead using a competency filter', async () => {
    await expect(setup().picker.pickQuestForToday('world', undefined, 'future-skill', 'student')).rejects.toThrow('Selesaikan prasyarat');
  });
  it('unlocks independent branches only when their prerequisite chapter is complete', () => {
    const quests = [
      { id: 'a1', chapterId: 'a', chapter: { prerequisiteChapterId: null } },
      { id: 'a2', chapterId: 'a', chapter: { prerequisiteChapterId: null } },
      { id: 'b1', chapterId: 'b', chapter: { prerequisiteChapterId: 'a' } },
      { id: 'c1', chapterId: 'c', chapter: { prerequisiteChapterId: 'a' } },
      { id: 'd1', chapterId: 'd', chapter: { prerequisiteChapterId: 'b' } },
    ];
    expect(availableKoreanQuests(quests, new Set(['a1'])).map(q => q.id)).toEqual(['a2']);
    expect(availableKoreanQuests(quests, new Set(['a1', 'a2'])).map(q => q.id)).toEqual(['b1', 'c1']);
    expect(availableKoreanQuests(quests, new Set(['a1', 'a2', 'b1'])).map(q => q.id)).toEqual(['c1', 'd1']);
  });
  it('keeps professional and TOPIK I branches optional for the advanced core path', () => {
    expect(optionalKoreanQuest('KOR-KO05-U01-L01')).toBe(true);
    expect(optionalKoreanQuest('KOR-KO06-U14-L04')).toBe(true);
    expect(optionalKoreanQuest('KOR-KO08-U04-L04')).toBe(true);
    expect(optionalKoreanQuest('KOR-KO08-U05-L01')).toBe(false);
    expect(optionalKoreanQuest('KOR-KO07-U01-L01')).toBe(false);
  });
});
