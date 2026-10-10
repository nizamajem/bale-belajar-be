import { UserRole } from '@prisma/client';
import { StudentQuestsService } from './student-quests.service';

describe('Korean writing review', () => {
  const user = { id: 'reviewer', role: UserRole.ADMIN };
  function setup(writingScore = 80, status = 'MENTOR_REVIEW_NEEDED') {
    const criteria = [['task_completion', 30], ['coherence', 25], ['grammar', 25], ['vocabulary', 20]] as const;
    const answer = { id: 'answer', questAttemptId: 'attempt', evaluationStatus: status,
      question: { questionType: 'LONG_TEXT', competencyId: 'skill', rubricCriteria: criteria.map(([criterionId, weightPct]) => ({ criterionId, weightPct })),
        quest: { world: { key: 'korean-learning' } } },
      attempt: { status: 'SUBMITTED', assignment: { id: 'assignment', studentProfileId: 'student', worldId: 'world', questId: 'quest',
        quest: { xpRewardFirst: 60, xpMultiplierSecond: 0.5, xpMultiplierThirdPlus: 0.25 } } },
    };
    const tx = { questAnswer: { findUnique: jest.fn().mockResolvedValue(answer), updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      findMany: jest.fn().mockResolvedValue([{ score: writingScore, question: { questionType: 'LONG_TEXT' } }, ...Array.from({ length: 11 }, () => ({ score: 100, question: { questionType: 'SINGLE_CHOICE' } }))]) },
      questAttempt: { update: jest.fn().mockResolvedValue({}) }, questAssignment: { count: jest.fn().mockResolvedValue(0) } };
    const ledger = { appendXp: jest.fn().mockResolvedValue({}) };
    const mastery = { recordEvidence: jest.fn().mockResolvedValue({}) };
    const service = new StudentQuestsService({ $transaction: (fn: (client: typeof tx) => unknown) => fn(tx) } as never, ledger as never, mastery as never);
    const dto = { criteria: criteria.map(([criterionId]) => ({ criterionId, score: writingScore })), feedback: 'Periksa koherensi dan ejaan.' };
    return { service, dto, tx, ledger, mastery };
  }
  it('validates writing, records reviewer evidence and grants challenge XP after passing', async () => {
    const { service, dto, tx, ledger, mastery } = setup();
    const result = await service.reviewKoreanWriting(user, 'answer', dto);
    expect(result).toMatchObject({ score: 80, passed: true, reviewPending: false, xpGained: 60 });
    expect(tx.questAnswer.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ evaluationStatus: 'VALIDATED', evaluatorDetail: expect.objectContaining({ reviewerId: 'reviewer' }) }) }));
    expect(ledger.appendXp).toHaveBeenCalledTimes(1);
    expect(mastery.recordEvidence).toHaveBeenCalledTimes(1);
  });
  it('does not let perfect automatic answers conceal failed writing', async () => {
    const { service, dto, ledger } = setup(50);
    const result = await service.reviewKoreanWriting(user, 'answer', dto);
    expect(result.overallScore).toBeGreaterThan(75);
    expect(result.passed).toBe(false);
    expect(ledger.appendXp).not.toHaveBeenCalled();
  });
  it('rejects missing, duplicated or unknown criterion scores', async () => {
    const { service, dto, tx } = setup();
    dto.criteria[3].criterionId = dto.criteria[0].criterionId;
    await expect(service.reviewKoreanWriting(user, 'answer', dto)).rejects.toThrow('kriteria');
    expect(tx.questAnswer.updateMany).not.toHaveBeenCalled();
  });
  it('requires all writing tasks to pass before rewarding a multi-task exam', async () => {
    const { service, dto, ledger, tx } = setup(80);
    tx.questAnswer.findMany.mockResolvedValue([{ score: 50, question: { questionType: 'LONG_TEXT' } },
      { score: 80, question: { questionType: 'LONG_TEXT' } }, ...Array.from({ length: 10 }, () => ({ score: 100, question: { questionType: 'SINGLE_CHOICE' } }))]);
    expect((await service.reviewKoreanWriting(user, 'answer', dto)).passed).toBe(false);
    expect(ledger.appendXp).not.toHaveBeenCalled();
  });
  it('rejects already validated writing to prevent duplicate XP', async () => {
    const { service, dto, ledger } = setup(80, 'VALIDATED');
    await expect(service.reviewKoreanWriting(user, 'answer', dto)).rejects.toThrow('sudah direview');
    expect(ledger.appendXp).not.toHaveBeenCalled();
  });
});
