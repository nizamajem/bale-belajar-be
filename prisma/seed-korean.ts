import { PrismaClient, MissionStatus, QuestionStatus, WorldKind, CurriculumLessonType, CurriculumModuleStatus } from '@prisma/client';
import { koreanUnits, buildKoreanExercises, validateKoreanCourse } from './korean-course-data';

/** Additive, repeatable seed. Never invokes the demo seed or changes other worlds. */
export async function seedKorean(prisma: PrismaClient) {
  const summary = validateKoreanCourse();
  const subject = await prisma.subject.upsert({ where: { code: 'KOR' },
    update: { name: 'Bahasa Korea', isActive: true },
    create: { code: 'KOR', name: 'Bahasa Korea', description: 'Pembelajaran Korea interaktif untuk peserta Indonesia.' } });
  const worldData = { subjectId: subject.id, kind: WorldKind.QUEST, name: 'Belajar Bahasa Korea',
    characterClass: 'Korean Communicator', themeDescription: 'Hangul dan Survival Korean: pelajaran bertahap, latihan, review, dan XP.', isActive: true, orderNumber: 5 };
  const world = await prisma.world.upsert({ where: { key: 'korean-learning' }, update: worldData,
    create: { key: 'korean-learning', ...worldData } });
  let previousChapterId: string | null = null;
  let previousCompetencyId: string | null = null;
  for (const [index, unit] of koreanUnits.entries()) {
    const previousUnit = koreanUnits[index - 1];
    const result = await prisma.$transaction(async tx => {
      const chapterData = { worldId: world.id, subWorldKey: `KOR-${unit.level}`,
        subWorldName: unit.level === 'KO00' ? 'Hangul Foundations' : 'Survival Korean',
        chapterNumber: index + 1, title: unit.title, story: unit.goal, goal: unit.goal,
        prerequisiteChapterId: previousChapterId, difficulty: 'BEGINNER', estimatedDurationDays: 6,
        recommendedSessions: 4, completionIndicator: 'Lulus setiap lesson dengan skor minimal 75; ulangi lesson yang belum lulus.',
        bossMissionUnlockMasteryPct: 75, status: MissionStatus.ACTIVE };
      const chapter = await tx.chapter.upsert({ where: { chapterCode: unit.code }, update: chapterData,
        create: { chapterCode: unit.code, ...chapterData } });
      const competencyData = { chapterId: chapter.id, name: unit.title, description: unit.goal, orderNumber: index + 1, isActive: true };
      const competency = await tx.competency.upsert({ where: { subjectId_code: { subjectId: subject.id, code: `${unit.code}-C01` } },
        update: competencyData, create: { subjectId: subject.id, code: `${unit.code}-C01`, ...competencyData } });
      if (previousCompetencyId) await tx.competencyPrerequisite.upsert({
        where: { competencyId_prerequisiteCompetencyId: { competencyId: competency.id, prerequisiteCompetencyId: previousCompetencyId } },
        update: {}, create: { competencyId: competency.id, prerequisiteCompetencyId: previousCompetencyId } });
      const moduleData = { title: unit.title, simpleGoal: unit.goal, bigIdea: unit.explanation,
        competencyId: competency.id, estimatedMinutes: 80, status: CurriculumModuleStatus.ACTIVE };
      const existingModule = await tx.curriculumModule.findUnique({ where: { worldId_slug: { worldId: world.id, slug: unit.code.toLowerCase() } } });
      const lastModule = await tx.curriculumModule.aggregate({ where: { worldId: world.id }, _max: { orderNumber: true } });
      const module = await tx.curriculumModule.upsert({ where: { worldId_slug: { worldId: world.id, slug: unit.code.toLowerCase() } },
        update: moduleData, create: { worldId: world.id, slug: unit.code.toLowerCase(), orderNumber: existingModule?.orderNumber ?? (lastModule._max.orderNumber ?? 0) + 1, ...moduleData } });
      const category = await tx.vocabCategory.upsert({ where: { key: unit.code.toLowerCase() },
        update: { name: unit.title, isActive: true }, create: { key: unit.code.toLowerCase(), name: unit.title } });
      for (const word of unit.words) await tx.vocabWord.upsert({ where: { categoryId_english: { categoryId: category.id, english: word.en } },
        update: { korean: word.ko, indonesian: word.id, isActive: true },
        create: { categoryId: category.id, english: word.en, korean: word.ko, indonesian: word.id } });
      for (let stage = 1; stage <= 4; stage++) {
        const code = `${unit.code}-L${String(stage).padStart(2, '0')}`;
        const phase = ['Kenali', 'Pahami', 'Gunakan', 'Tantangan dan review'][stage - 1];
        const title = `${unit.title} · ${phase}`;
        const lessonData = { type: CurriculumLessonType.CONCEPT, title,
          body: `${unit.explanation}\n\nPelafalan: ${unit.pronunciation}\n\nKonteks: ${unit.culture}`,
          examples: unit.phrases.map(p => `${p.ko}\n${p.id}\n${p.en}`),
          items: [...unit.words.map(w => `${w.ko} — ${w.id} (${w.en})`), `Misi: ${unit.mission}`] };
        await tx.curriculumLesson.upsert({ where: { moduleId_orderNumber: { moduleId: module.id, orderNumber: stage } },
          update: lessonData, create: { moduleId: module.id, orderNumber: stage, ...lessonData } });
        const instruction = stage === 4
          ? `Kerjakan tanpa melihat catatan. Misi mandiri: ${unit.mission}`
          : `${unit.explanation}\n\n${unit.words.map(w => `${w.ko} — ${w.id}`).join('\n')}\n\nContoh:\n${unit.phrases.map(p => `${p.ko} — ${p.id}`).join('\n')}\n\nPelafalan: ${unit.pronunciation}\n\nBaca contoh dengan suara sendiri. Misi: ${unit.mission}`;
        const questData = { worldId: world.id, chapterId: chapter.id, title, story: unit.goal, objective: unit.goal,
          studentInstruction: instruction, missionType: stage === 4 ? 'CHALLENGE' : 'KOREAN_LESSON',
          estimatedMinutes: 20, xpRewardFirst: stage === 4 ? 60 : 40, xpMultiplierSecond: 0.5,
          xpMultiplierThirdPlus: 0.25, hints: stage === 4 ? [] : [unit.pronunciation, unit.explanation], status: MissionStatus.ACTIVE };
        const quest = await tx.quest.upsert({ where: { code }, update: questData, create: { code, ...questData } });
        const exercises = buildKoreanExercises(unit, stage, previousUnit);
        const activeCodes: string[] = [];
        for (const [qIndex, exercise] of exercises.entries()) {
          const questionCode = `${code}-Q${String(qIndex + 1).padStart(2, '0')}`;
          activeCodes.push(questionCode);
          const questionData = { questId: quest.id, competencyId: competency.id, questionType: exercise.type,
            orderNumber: qIndex + 1, questionText: exercise.prompt, instruction: exercise.instruction,
            measurementCategory: exercise.skill, difficulty: 'EASY', bloomLevel: stage === 4 ? 'APPLY' : 'UNDERSTAND',
            skillTags: ['korean-learning', unit.level, exercise.skill], masteryPoint: 1, xpReward: 0,
            estimatedTimeSeconds: 60, inputMode: exercise.type === 'SHORT_TEXT' ? 'text' : null,
            maxLength: exercise.type === 'SHORT_TEXT' ? 120 : null, caseSensitive: false,
            sampleAnswer: exercise.answer ?? exercise.tokens?.join(' ') ?? null, status: QuestionStatus.ACTIVE };
          const question = await tx.questQuestion.upsert({ where: { code: questionCode }, update: questionData,
            create: { code: questionCode, ...questionData } });
          // These child IDs are not student-answer FKs. Payload IDs below remain stable on reseed.
          await tx.questQuestionOption.deleteMany({ where: { questQuestionId: question.id } });
          await tx.questMatchingPair.deleteMany({ where: { questQuestionId: question.id } });
          await tx.questOrderItem.deleteMany({ where: { questQuestionId: question.id } });
          await tx.questAcceptedAnswer.deleteMany({ where: { questQuestionId: question.id } });
          if (exercise.choices) {
            const shift = (qIndex + stage) % exercise.choices.length;
            const options = exercise.choices.map((label, optionIndex) => ({ questQuestionId: question.id,
              optionId: `O${optionIndex + 1}`, label, isCorrect: label === exercise.answer,
              displayOrder: ((optionIndex + shift) % exercise.choices!.length) + 1,
              misconception: label === exercise.answer ? null : 'Hubungkan tulisan dengan makna yang dipelajari; coba lagi pada review.' }));
            await tx.questQuestionOption.createMany({ data: options });
          }
          if (exercise.pairs) await tx.questMatchingPair.createMany({ data: exercise.pairs.map((pair, pairIndex) => ({
            questQuestionId: question.id, leftId: `L${pairIndex + 1}`, leftLabel: pair.ko,
            rightId: `R${(pairIndex + stage) % exercise.pairs!.length + 1}`, rightLabel: pair.id, pairOrder: pairIndex + 1 })) });
          if (exercise.tokens) await tx.questOrderItem.createMany({ data: exercise.tokens.map((label, itemIndex) => ({
            questQuestionId: question.id, itemKind: 'ordering', itemId: `I${itemIndex + 1}`, label,
            displayOrder: (itemIndex + 1) % exercise.tokens!.length + 1, correctPosition: itemIndex + 1 })) });
          if (exercise.type === 'SHORT_TEXT') await tx.questAcceptedAnswer.create({ data: {
            questQuestionId: question.id, answerText: exercise.answer!, isPrimary: true } });
        }
        await tx.questQuestion.updateMany({ where: { questId: quest.id, code: { notIn: activeCodes } }, data: { status: QuestionStatus.ARCHIVED } });
      }
      return { chapterId: chapter.id, competencyId: competency.id };
    }, { timeout: 60_000 });
    previousChapterId = result.chapterId;
    previousCompetencyId = result.competencyId;
  }
  console.log(`Korean course seeded: ${summary.units} units, ${summary.lessons} lessons, ${summary.questions} activities (world=korean-learning).`);
  return summary;
}
