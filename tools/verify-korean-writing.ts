import { strict as assert } from 'node:assert';
import { PrismaClient, Prisma, UserRole } from '@prisma/client';
import { StudentQuestsService } from '../src/modules/student-quests/student-quests.service';
import { ExperienceLedgerService } from '../src/modules/experience-ledger/experience-ledger.service';
import { MasteryService } from '../src/modules/mastery/mastery.service';

async function main() {
  const prisma = new PrismaClient();
  const rollback = new Error('ROLLBACK_KOREAN_WRITING_QA');
  let profileId = '';
  try {
    try {
      await prisma.$transaction(async tx => {
        const profile = await tx.studentProfile.create({ data: { fullName: 'Temporary Korean writing QA' } });
        profileId = profile.id;
        const quest = await tx.quest.findUniqueOrThrow({ where: { code: 'KOR-KO02-U01-L04' }, include: { questions: { include: {
          rubricCriteria: true, options: true, matchingPairs: true, orderItems: true, acceptedAnswers: true,
        } } } });
        const assignment = await tx.questAssignment.create({ data: { studentProfileId: profile.id, worldId: quest.worldId,
          questId: quest.id, assignedDate: new Date(), status: 'STARTED' } });
        const attempt = await tx.questAttempt.create({ data: { questAssignmentId: assignment.id, status: 'IN_PROGRESS' } });
        const writing = quest.questions.find(q => q.questionType === 'LONG_TEXT')!;
        for (const question of quest.questions) await tx.questAnswer.create({ data: {
          questAttemptId: attempt.id, questQuestionId: question.id,
          payload: question.id === writing.id ? { text: '저는 아침 일곱 시에 일어나요. 아침을 먹고 학교에 가요. 오후에는 도서관에서 한국어를 공부해요.' } : {
            ...(question.options.length ? { selectedOptionId: question.options.find(o => o.isCorrect)!.optionId } : {}),
            ...(question.acceptedAnswers.length ? { text: question.acceptedAnswers[0].answerText } : {}),
            ...(question.matchingPairs.length ? { matches: Object.fromEntries(question.matchingPairs.map(p => [p.leftId, p.rightId])) } : {}),
            ...(question.orderItems.length ? { order: [...question.orderItems].sort((a, b) => a.correctPosition - b.correctPosition).map(i => i.itemId) } : {}),
          },
        } });
        const adapter = Object.assign({}, tx, { $transaction: (fn: (client: Prisma.TransactionClient) => Promise<unknown>) => fn(tx) });
        const service = new StudentQuestsService(adapter as never, new ExperienceLedgerService(adapter as never), new MasteryService(adapter as never));
        const student = { id: profile.id, role: UserRole.STUDENT, studentProfileId: profile.id };
        const submitted = await service.submitAttempt(student, attempt.id);
        assert.equal(submitted.overallScore, null);
        assert.equal(submitted.passed, false);
        assert.equal(submitted.xpGained, 0);
        const before = await service.getResult(student, attempt.id);
        assert.equal(before.passed, false);
        assert.equal(before.reviewPending, true);
        const answer = await tx.questAnswer.findUniqueOrThrow({ where: { questAttemptId_questQuestionId: { questAttemptId: attempt.id, questQuestionId: writing.id } } });
        const dto = { criteria: writing.rubricCriteria.map(c => ({ criterionId: c.criterionId, score: 80 })), feedback: 'QA: coherent response, check spacing.' };
        const result = await service.reviewKoreanWriting({ id: profile.id, role: UserRole.ADMIN }, answer.id, dto);
        assert.equal(result.passed, true);
        assert.equal(result.xpGained, 60);
        assert.equal(result.reviewPending, false);
        assert.equal(await tx.masteryEvent.count({ where: { studentProfileId: profile.id } }), quest.questions.length);
        assert.equal(await tx.experienceLedgerEntry.count({ where: { studentProfileId: profile.id, amount: 60 } }), 1);
        const after = await service.getResult(student, attempt.id);
        assert.equal(after.passed, true);
        assert.equal(after.reviewPending, false);
        assert.equal(after.questions.find(q => q.id === writing.id)?.feedback, dto.feedback);
        await assert.rejects(() => service.reviewKoreanWriting({ id: profile.id, role: UserRole.ADMIN }, answer.id, dto));
        throw rollback;
      }, { timeout: 30_000 });
    } catch (error) { if (error !== rollback) throw error; }
    assert.equal(await prisma.studentProfile.findUnique({ where: { id: profileId } }), null, 'QA student must roll back');
    console.log('Writing database workflow passed: pending → reviewed → mastery/XP/feedback; duplicate review rejected; temporary data rolled back.');
  } finally { await prisma.$disconnect(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
