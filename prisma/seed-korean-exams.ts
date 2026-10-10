import { PrismaClient } from '@prisma/client';
import { koreanExams, validateKoreanExams } from './korean-exam-data';

export async function seedKoreanExams(prisma: PrismaClient, subjectId: string) {
 const summary = validateKoreanExams();
 for (const [index, exam] of koreanExams.entries()) await prisma.$transaction(async tx => {
  const title = `TOPIK II ${exam.mode} · Simulasi latihan`;
  const instruction = `Latihan asli Bale Belajar, ${exam.questions.length} soal / ${exam.minutes} menit. Timer dimulai saat sesi dibuka dan tetap berjalan ketika aplikasi ditutup. Writing dinilai reviewer; hasil latihan bukan nilai TOPIK resmi atau prediksi kelulusan. ${exam.mode === 'PBT' ? 'Panduan pembagian waktu: listening 60, writing 50, reading 70 menit. PBT di aplikasi dikerjakan dengan keyboard, bukan lembar 원고지.' : 'Panduan pembagian waktu: listening 35, reading 40, writing 50 menit. Target panjang dan bobot tugas writing merupakan rancangan latihan; bukan konversi skor IBT resmi.'} Timer total ditegakkan; pembagian waktu per bagian merupakan panduan. Ada jenis soal dan kondisi ujian resmi yang belum direplikasi. Jawaban kosong mendapat 0. Tekan Kirim untuk mengakhiri sesi.`;
  const worldData = { subjectId, name: title, kind: 'QUEST' as const, characterClass: 'TOPIK Practice',
   themeDescription: instruction, isActive: true, orderNumber: 50 + index };
  const world = await tx.world.upsert({ where: { key: exam.worldKey }, update: worldData, create: { key: exam.worldKey, ...worldData } });
  const chapterData = { worldId: world.id, chapterNumber: 1, title, goal: 'Latihan lengkap listening, reading dan writing dalam waktu terbatas.', difficulty: 'ADVANCED', status: 'ACTIVE' as const };
  const chapter = await tx.chapter.upsert({ where: { chapterCode: exam.code }, update: chapterData, create: { chapterCode: exam.code, ...chapterData } });
  const competencyData = { chapterId: chapter.id, name: title, description: instruction, orderNumber: 1, isActive: true };
  const competency = await tx.competency.upsert({ where: { subjectId_code: { subjectId, code: `${exam.code}-C01` } }, update: competencyData, create: { subjectId, code: `${exam.code}-C01`, ...competencyData } });
  const moduleData = { competencyId: competency.id, title, simpleGoal: chapterData.goal, bigIdea: instruction, status: 'ACTIVE' as const, estimatedMinutes: exam.minutes };
  const module = await tx.curriculumModule.upsert({ where: { worldId_slug: { worldId: world.id, slug: exam.code.toLowerCase() } }, update: moduleData, create: { worldId: world.id, slug: exam.code.toLowerCase(), orderNumber: 1, ...moduleData } });
  await tx.curriculumLesson.upsert({ where: { moduleId_orderNumber: { moduleId: module.id, orderNumber: 1 } }, update: { title, body: instruction }, create: { moduleId: module.id, orderNumber: 1, type: 'CONCEPT', title, body: instruction, examples: [], items: [] } });
  const questData = { worldId: world.id, chapterId: chapter.id, title, objective: chapterData.goal, story: instruction,
   studentInstruction: instruction, missionType: `TOPIK_MOCK_${exam.mode}`, estimatedMinutes: exam.minutes,
   xpRewardFirst: 120, xpMultiplierSecond: 0.5, xpMultiplierThirdPlus: 0.25, hints: [], status: 'ACTIVE' as const };
  const quest = await tx.quest.upsert({ where: { code: `${exam.code}-L01` }, update: questData, create: { code: `${exam.code}-L01`, ...questData } });
  const activeCodes: string[] = [];
  const sectionNumbers = { listening: 0, reading: 0, writing: 0 };
  for (const [qIndex, exercise] of exam.questions.entries()) {
   const code = `${quest.code}-Q${String(qIndex + 1).padStart(3, '0')}`;
   activeCodes.push(code);
   sectionNumbers[exercise.section]++;
   const data = { questId: quest.id, competencyId: competency.id, questionType: exercise.type,
    questionText: `${exercise.section.toUpperCase()} ${sectionNumbers[exercise.section]}\n${exercise.prompt}`, instruction: exercise.instruction,
    orderNumber: qIndex + 1, measurementCategory: exercise.section, difficulty: qIndex < 20 ? 'MEDIUM' : 'HARD',
    skillTags: ['korean-learning', 'topik-practice', exam.mode, exercise.skill], bloomLevel: 'ANALYZE',
    inputMode: exercise.type === 'LONG_TEXT' ? 'text' : null, maxLength: exercise.maxCharacters ?? null,
    scoringConfig: JSON.stringify({ examMode: exam.mode, section: exercise.section, points: exercise.points,
      ...(exercise.type === 'LONG_TEXT' ? { minCharacters: exercise.minCharacters, maxCharacters: exercise.maxCharacters, manualReview: true } : {}) }),
    sampleAnswer: exercise.answer ?? null, status: 'ACTIVE' as const, xpReward: 0, masteryPoint: 1 };
   const question = await tx.questQuestion.upsert({ where: { code }, update: data, create: { code, ...data } });
   await tx.questQuestionOption.deleteMany({ where: { questQuestionId: question.id } });
   await tx.questMedia.deleteMany({ where: { questQuestionId: question.id } });
   await tx.questRubricCriterion.deleteMany({ where: { questQuestionId: question.id } });
   if (exercise.choices) await tx.questQuestionOption.createMany({ data: exercise.choices.map((label, optionIndex) => ({
    questQuestionId: question.id, optionId: `O${optionIndex + 1}`, label, isCorrect: label === exercise.answer,
    displayOrder: (optionIndex + qIndex) % exercise.choices!.length + 1,
   })) });
   if (exercise.audioScript) await tx.questMedia.create({ data: { questQuestionId: question.id, mediaType: 'tts', url: 'tts:ko-KR', transcript: exercise.audioScript, transcriptAvailable: false, maxReplay: 2 } });
   if (exercise.rubric) await tx.questRubricCriterion.createMany({ data: exercise.rubric.map(([criterionId, criterion, weightPct]) => ({
    questQuestionId: question.id, criterionId, criterion, weightPct, criterionDescription: 'Nilai kinerja 0–100 per kriteria; periksa konteks dan seluruh tuntutan soal. Bukan pemeriksaan kata kunci otomatis.',
    scoreDescriptions: { '0': 'Belum memenuhi', '50': 'Sebagian memenuhi', '100': 'Lengkap dan akurat' },
   })) });
  }
  await tx.questQuestion.updateMany({ where: { questId: quest.id, code: { notIn: activeCodes } }, data: { status: 'ARCHIVED' } });
 }, { timeout: 60_000 });
 console.log(`Korean exam practice seeded: ${summary.mockExams} modes, ${summary.mockQuestions} questions.`);
 return summary;
}
