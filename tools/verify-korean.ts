import { strict as assert } from 'node:assert';
import { PrismaClient, UserRole } from '@prisma/client';
import { validateKoreanCourse, koreanUnits } from '../prisma/korean-course-data';
import { prerequisiteKoreanUnit } from '../prisma/korean-extended-data';
import { koreanListeningChecks } from '../prisma/korean-listening-data';
import { StudentQuestsService } from '../src/modules/student-quests/student-quests.service';
import { WorldsService } from '../src/modules/worlds/worlds.service';
import { evaluateQuestAnswer, QuestAnswerPayload, QuestQuestionForEvaluation } from '../src/modules/student-quests/quest-evaluation.util';

async function main() {
  const prisma = new PrismaClient();
  try {
    const expected = validateKoreanCourse();
    const world = await prisma.world.findUniqueOrThrow({ where: { key: 'korean-learning' },
      include: { chapters: { orderBy: { chapterNumber: 'asc' }, include: {
        quests: { orderBy: { code: 'asc' }, include: { questions: { where: { status: 'ACTIVE' },
          orderBy: { orderNumber: 'asc' }, include: { options: true, matchingPairs: true,
            orderItems: true, acceptedAnswers: true, competency: true, rubricCriteria: true,
            media: true, hotspotAreas: true, evidenceItems: true, codeConfig: true } } } },
      } } } });
    assert.equal(world.kind, 'QUEST');
    assert.equal(world.isActive, true);
    assert.equal(world.chapters.length, expected.units);
    const quests = world.chapters.flatMap(chapter => chapter.quests);
    assert.equal(quests.length, expected.lessons);
    assert.equal(quests.flatMap(quest => quest.questions).length, expected.questions);
    for (const [index, chapter] of world.chapters.entries()) {
      const prerequisite = prerequisiteKoreanUnit(koreanUnits[index], koreanUnits[index - 1]);
      assert.equal(chapter.prerequisiteChapterId, prerequisite ? world.chapters.find(c => c.chapterCode === prerequisite)!.id : null);
      assert.equal(chapter.quests.length, 4);
      assert.equal(chapter.chapterNumber, index + 1);
    }
    const service = new StudentQuestsService(prisma as never, {} as never, {} as never);
    const serializer = service as unknown as {
      serializeQuestionForAttempt: (question: unknown, saved: null, reveal: boolean) => Record<string, unknown>;
    };
    const user = { id: '00000000-0000-0000-0000-000000000000', role: UserRole.STUDENT,
      studentProfileId: '00000000-0000-0000-0000-000000000000' };
    const path = await service.getKoreanPath(user);
    const worldsService = new WorldsService(prisma as never);
    const discovered = await worldsService.findAllForStudent(user);
    assert.ok(discovered.some(item => item.key === 'korean-learning'), 'Course missing from app world discovery');
    const curriculum = await worldsService.findCurriculumByWorldKey('korean-learning');
    assert.equal(curriculum.modules.length, expected.units);
    assert.equal(curriculum.modules.flatMap(module => module.lessons).length, expected.lessons);
    assert.equal(path.lessonCount, expected.lessons);
    assert.equal(path.units.flatMap(unit => unit.lessons).filter(lesson => lesson.state === 'AVAILABLE').length, 1);
    assert.equal(path.nextLessonCode, 'KOR-KO00-U01-L01');
    const types = new Set<string>();
    for (const quest of quests) {
      assert.equal(quest.status, 'ACTIVE');
      assert.equal(quest.questions.length, /^KOR-KO0[01]-/.test(quest.code) ? 10 : 12);
      for (const [index, question] of quest.questions.entries()) {
        assert.equal(question.orderNumber, index + 1);
        assert.equal(question.competency.chapterId, quest.chapterId);
        types.add(question.questionType);
        const payload: QuestAnswerPayload = {
          selectedOptionId: question.options.find(option => option.isCorrect)?.optionId,
          text: question.acceptedAnswers[0]?.answerText,
          matches: Object.fromEntries(question.matchingPairs.map(pair => [pair.leftId, pair.rightId])),
          order: [...question.orderItems].sort((a, b) => a.correctPosition - b.correctPosition).map(item => item.itemId),
        };
        const evaluationQuestion: QuestQuestionForEvaluation = { ...question,
          acceptedAnswers: question.acceptedAnswers.map(answer => ({ ...answer,
            toleranceNumeric: answer.toleranceNumeric === null ? null : Number(answer.toleranceNumeric) })) };
        if (question.questionType === 'LONG_TEXT') {
          assert.equal(evaluateQuestAnswer(evaluationQuestion, { text: '자유롭게 작성한 글' }).score, null, question.code);
          assert.equal(question.rubricCriteria.reduce((sum, criterion) => sum + Number(criterion.weightPct), 0), 100);
        } else {
          assert.equal(evaluateQuestAnswer(evaluationQuestion, payload).score, 100, question.code);
          assert.equal(evaluateQuestAnswer(evaluationQuestion, {}).score, 0, `${question.code}: empty answer`);
        }
        if (question.questionType === 'AUDIO_CHOICE') {
          assert.equal(question.media[0]?.mediaType, 'tts');
          assert.ok(question.media[0]?.transcript);
          const unitCode = quest.code.replace(/-L\d+$/, '');
          if (koreanListeningChecks[unitCode]) {
            assert.notEqual(question.media[0].transcript, koreanUnits.find(u => u.code === unitCode)!.extension!.passage,
              'Advanced listening must not reveal its answer through the reading passage');
          }
        }
        const publicQuestion = serializer.serializeQuestionForAttempt(question, null, false);
        const serialized = JSON.stringify(publicQuestion);
        for (const key of ['isCorrect', 'correctPosition', 'correctOrder', 'sampleAnswer', 'acceptedAnswers']) {
          assert.ok(!serialized.includes(`"${key}":`), `${question.code}: leaked ${key}`);
        }
      }
    }
    assert.equal(types.size, 6);
    console.log(JSON.stringify({ ...expected, types: [...types], perfectAnswers: 'passed', emptyAnswers: 'rejected',
      prerequisites: 'valid', publicPayloads: 'no answer keys', path: 'one starting lesson available',
      appDiscovery: 'visible', appCurriculum: `${expected.units} modules and ${expected.lessons} supporting lessons`, writing: 'human review required', independentListeningTexts: Object.keys(koreanListeningChecks).length }, null, 2));
  } finally { await prisma.$disconnect(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
