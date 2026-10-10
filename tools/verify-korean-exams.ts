import { strict as assert } from 'node:assert';
import { PrismaClient, Prisma, UserRole } from '@prisma/client';
import { koreanExams } from '../prisma/korean-exam-data';
import { StudentQuestsService } from '../src/modules/student-quests/student-quests.service';
import { ExperienceLedgerService } from '../src/modules/experience-ledger/experience-ledger.service';
import { MasteryService } from '../src/modules/mastery/mastery.service';
import { summarizeKoreanExam } from '../src/modules/student-quests/korean-exam.util';

async function main() {
 const prisma = new PrismaClient();
 const rollback = new Error('ROLLBACK_EXAM_QA');
 const profiles: string[] = [];
 try {
  for (const exam of koreanExams) {
   const quest = await prisma.quest.findUniqueOrThrow({ where: { code: `${exam.code}-L01` }, include: { questions: { where: { status: 'ACTIVE' }, include: { options: true, media: true, rubricCriteria: true } } } });
   assert.equal(quest.questions.length, exam.mode === 'PBT' ? 104 : 63);
   assert.equal(quest.estimatedMinutes, exam.minutes);
   for (const section of ['listening', 'reading', 'writing']) assert.equal(quest.questions.filter(q => q.measurementCategory === section).length, exam.questions.filter(q => q.section === section).length);
   for (const question of quest.questions) {
    if (question.questionType === 'LONG_TEXT') assert.equal(question.rubricCriteria.reduce((sum, r) => sum + Number(r.weightPct), 0), 100);
    else { assert.equal(question.options.length, 4); assert.equal(question.options.filter(o => o.isCorrect).length, 1); }
    if (question.questionType === 'AUDIO_CHOICE') { assert.ok(question.media[0].transcript); assert.equal(question.media[0].url, 'tts:ko-KR'); }
   }
   const perfect = summarizeKoreanExam(quest.missionType, quest.questions, quest.questions.map(q => ({ questionId: q.id, score: 100 })));
   assert.equal(perfect!.overallScore, 100);
   assert.equal(perfect!.pbtPracticePoints, exam.mode === 'PBT' ? 300 : null);
  }
  try {
   await prisma.$transaction(async tx => {
    const adapter = Object.assign({}, tx, { $transaction: (fn: (client: Prisma.TransactionClient) => Promise<unknown>) => fn(tx) });
    const service = new StudentQuestsService(adapter as never, new ExperienceLedgerService(adapter as never), new MasteryService(adapter as never));
    for (const mode of ['PBT', 'IBT'] as const) {
     const profile = await tx.studentProfile.create({ data: { fullName: `Temporary ${mode} exam QA` } });
     profiles.push(profile.id);
     const student = { id: profile.id, role: UserRole.STUDENT, studentProfileId: profile.id };
     const quest = await tx.quest.findUniqueOrThrow({ where: { code: `KOR-EXAM-${mode}-01-L01` }, include: { questions: { where: { status: 'ACTIVE' }, orderBy: { orderNumber: 'asc' }, include: { options: true, rubricCriteria: true } } } });
     const assignment = await tx.questAssignment.create({ data: { studentProfileId: profile.id, worldId: quest.worldId, questId: quest.id, assignedDate: new Date(), status: 'STARTED' } });
     const attempt = await service.startAttempt(student, assignment.id);
     assert.ok(attempt.expiresAt);
     if (mode === 'IBT') {
      await service.saveAnswer(student, attempt.id, quest.questions[0].id, { payload: { selectedOptionId: quest.questions[0].options.find(o => o.isCorrect)!.optionId } });
      await tx.questAttempt.update({ where: { id: attempt.id }, data: { startedAt: new Date(Date.now() - 126 * 60_000) } });
      await assert.rejects(() => service.saveAnswer(student, attempt.id, quest.questions[1].id, { payload: {} }), /Waktu simulasi habis/);
      const result = await service.submitAttempt(student, attempt.id);
      assert.equal(result.passed, false);
      assert.equal(result.reviewPending, false);
      assert.equal(result.xpGained, 0);
      assert.ok(result.exam!.overallScore! < 2);
     } else {
      for (const question of quest.questions) {
       const config = JSON.parse(question.scoringConfig!);
       await service.saveAnswer(student, attempt.id, question.id, { payload: question.questionType === 'LONG_TEXT'
        ? { text: '가'.repeat(Math.max(config.minCharacters, 20)) } : { selectedOptionId: question.options.find(o => o.isCorrect)!.optionId } });
      }
      const result = await service.submitAttempt(student, attempt.id);
      assert.equal(result.overallScore, null);
      assert.equal(result.xpGained, 0);
      assert.equal(result.exam!.sections.find(s => s.section === 'listening')!.score, 100);
      const writing = quest.questions.filter(q => q.questionType === 'LONG_TEXT');
      for (const [index, question] of writing.entries()) {
       const answer = await tx.questAnswer.findUniqueOrThrow({ where: { questAttemptId_questQuestionId: { questAttemptId: attempt.id, questQuestionId: question.id } } });
       const reviewed = await service.reviewKoreanWriting({ id: profile.id, role: UserRole.ADMIN }, answer.id, {
        criteria: question.rubricCriteria.map(r => ({ criterionId: r.criterionId, score: 80 })), feedback: 'Synthetic QA grade; transaction rolls back.' });
       assert.equal(reviewed.reviewPending, index < writing.length - 1);
       assert.equal(reviewed.xpGained, index < writing.length - 1 ? 0 : 120);
      }
      const final = await service.getResult(student, attempt.id);
      assert.equal(final.exam!.pbtPracticePoints, 280);
      assert.equal(final.passed, true);
      assert.equal(await tx.experienceLedgerEntry.count({ where: { studentProfileId: profile.id, amount: 120 } }), 1);
     }
    }
    throw rollback;
   }, { timeout: 60_000 });
  } catch (error) { if (error !== rollback) throw error; }
  for (const id of profiles) assert.equal(await prisma.studentProfile.findUnique({ where: { id } }), null);
  console.log('Exam QA passed: PBT 104 / IBT 63; distinct deadlines; late answers rejected; unfinished tasks score 0; all writing reviews required; weighted sections and one final XP reward; temporary data rolled back.');
 } finally { await prisma.$disconnect(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
