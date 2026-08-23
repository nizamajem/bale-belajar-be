import { PrismaClient, QuestQuestionType } from "@prisma/client";

const prisma = new PrismaClient();

const MIN_ACTIVE_QUESTS_PER_WORLD = 5;
const MIN_ACTIVE_QUEST_QUESTIONS = 10;
const MIN_ACTIVE_QUESTIONS = 20;
const MIN_ACTIVE_MODULES_PER_WORLD = 1;
const MIN_ACTIVE_LESSONS_PER_WORLD = 3;
const MAX_TEMPLATE_QUESTION_RATIO_WARNING = 0.5;
const REQUIRED_PLACEMENT_TYPES = [
  "SINGLE_CHOICE",
  "MULTIPLE_SELECT",
  "BINARY_CHOICE",
  "SHORT_TEXT",
  "MATCHING",
  "ORDERING",
  "IMAGE_CHOICE",
  "AUDIO_CHOICE",
  "LONG_TEXT",
  "CODE_INPUT",
  "IMAGE_HOTSPOT",
  "VOICE_RESPONSE",
  "TIMELINE_BUILDER",
  "EVIDENCE_BOARD",
];

async function main() {
  const [
    worlds,
    activeQuestCount,
    activeQuestionCount,
    templates,
    sourceRows,
    questionIntegrity,
  ] = await Promise.all([
      prisma.world.findMany({
        where: { isActive: true },
        orderBy: { orderNumber: "asc" },
        include: {
          subject: { select: { name: true } },
          curriculumModules: {
            where: { status: "ACTIVE" },
            select: {
              id: true,
              lessons: { select: { id: true } },
              caseStudies: { select: { id: true } },
              remedialRules: { select: { id: true } },
            },
          },
          quests: {
            where: { status: "ACTIVE" },
            select: {
              code: true,
              title: true,
              questions: {
                where: { status: "ACTIVE" },
                select: { code: true },
              },
            },
          },
          _count: {
            select: {
              chapters: true,
              quests: { where: { status: "ACTIVE" } },
            },
          },
        },
      }),
      prisma.quest.count({ where: { status: "ACTIVE" } }),
      prisma.questQuestion.count({ where: { status: "ACTIVE" } }),
      prisma.placementQuestionTemplate.findMany({
        where: { isActive: true },
        orderBy: { orderNumber: "asc" },
        select: { code: true, questionType: true },
      }),
      prisma.curriculumSourceRecord.count(),
      getQuestionIntegrityReport(),
    ]);

  const placementTypes = new Set(
    templates.map((template) => template.questionType),
  );
  const duplicatePlacementTypes = [...placementTypes]
    .map((type) => ({
      type,
      count: templates.filter((template) => template.questionType === type)
        .length,
    }))
    .filter((item) => item.count > 1);
  const worldsWithLessonCounts = worlds.map((world) => {
    const activeLessons = world.curriculumModules.reduce(
      (total, module) => total + module.lessons.length,
      0,
    );
    const caseStudies = world.curriculumModules.reduce(
      (total, module) => total + module.caseStudies.length,
      0,
    );
    const remedialRules = world.curriculumModules.reduce(
      (total, module) => total + module.remedialRules.length,
      0,
    );
    const activeQuestions = world.quests.reduce(
      (total, quest) => total + quest.questions.length,
      0,
    );
    const templateQuestions = world.quests.reduce(
      (total, quest) =>
        total +
        quest.questions.filter((question) => question.code.includes("_TPL_Q"))
          .length,
      0,
    );
    return {
      world,
      activeLessons,
      caseStudies,
      remedialRules,
      activeQuestions,
      templateQuestions,
      templateQuestionRatio:
        activeQuestions === 0 ? 0 : templateQuestions / activeQuestions,
    };
  });
  const questsWithoutEnoughQuestions = worlds.flatMap((world) =>
    world.quests
      .filter((quest) => quest.questions.length < MIN_ACTIVE_QUEST_QUESTIONS)
      .map((quest) => ({
        worldKey: world.key,
        questCode: quest.code,
        activeQuestions: quest.questions.length,
      })),
  );
  const blockers = [
    ...(worlds.length === 0 ? ["Belum ada world aktif."] : []),
    ...(activeQuestCount === 0 ? ["Belum ada quest aktif."] : []),
    ...(activeQuestionCount < MIN_ACTIVE_QUESTIONS
      ? [
          `Pertanyaan aktif baru ${activeQuestionCount}; minimal produksi ${MIN_ACTIVE_QUESTIONS}.`,
        ]
      : []),
    ...worlds
      .filter((world) => world._count.chapters === 0)
      .map((world) => `World ${world.key} belum punya chapter.`),
    ...worlds
      .filter((world) => world._count.quests < MIN_ACTIVE_QUESTS_PER_WORLD)
      .map(
        (world) =>
          `World ${world.key} baru punya ${world._count.quests} quest aktif; minimal ${MIN_ACTIVE_QUESTS_PER_WORLD}.`,
      ),
    ...questsWithoutEnoughQuestions.map(
      (quest) =>
        `Quest ${quest.questCode} (${quest.worldKey}) baru punya ${quest.activeQuestions} pertanyaan aktif; minimal ${MIN_ACTIVE_QUEST_QUESTIONS}.`,
    ),
    ...worldsWithLessonCounts
      .filter(
        ({ world }) =>
          world.curriculumModules.length < MIN_ACTIVE_MODULES_PER_WORLD,
      )
      .map(
        ({ world }) =>
          `World ${world.key} belum punya module materi aktif.`,
      ),
    ...worldsWithLessonCounts
      .filter(({ activeLessons }) => activeLessons < MIN_ACTIVE_LESSONS_PER_WORLD)
      .map(
        ({ world, activeLessons }) =>
          `World ${world.key} baru punya ${activeLessons} lesson aktif; minimal ${MIN_ACTIVE_LESSONS_PER_WORLD}.`,
      ),
    ...REQUIRED_PLACEMENT_TYPES.filter((type) => !placementTypes.has(type)).map(
      (type) => `Template placement ${type} belum tersedia.`,
    ),
    ...duplicatePlacementTypes.map(
      (item) =>
        `Template placement ${item.type} duplikat ${item.count} kali.`,
    ),
    ...questionIntegrity.blockers,
  ];
  const qualityWarnings = [
    ...worldsWithLessonCounts
      .filter(
        ({ activeQuestions, templateQuestionRatio }) =>
          activeQuestions > 0 &&
          templateQuestionRatio > MAX_TEMPLATE_QUESTION_RATIO_WARNING,
      )
      .map(
        ({ world, templateQuestions, activeQuestions }) =>
          `World ${world.key} masih didominasi soal template (${templateQuestions}/${activeQuestions}).`,
      ),
  ];

  const report = {
    ready: blockers.length === 0,
    contentQualityReady: qualityWarnings.length === 0,
    counts: {
      sourceRows,
      activeWorlds: worlds.length,
      activeQuests: activeQuestCount,
      activeQuestions: activeQuestionCount,
      placementTemplates: templates.length,
    },
    worlds: worldsWithLessonCounts.map(
      ({
        world,
        activeLessons,
        caseStudies,
        remedialRules,
        activeQuestions,
        templateQuestions,
        templateQuestionRatio,
      }) => ({
        key: world.key,
        subject: world.subject.name,
        chapters: world._count.chapters,
        activeModules: world.curriculumModules.length,
        activeLessons,
        caseStudies,
        remedialRules,
        activeQuests: world._count.quests,
        activeQuestions,
        templateQuestions,
        templateQuestionRatio: Number(templateQuestionRatio.toFixed(2)),
        ready:
          world._count.chapters > 0 &&
          world._count.quests >= MIN_ACTIVE_QUESTS_PER_WORLD &&
          world.curriculumModules.length >= MIN_ACTIVE_MODULES_PER_WORLD &&
          activeLessons >= MIN_ACTIVE_LESSONS_PER_WORLD,
      }),
    ),
    missingPlacementTypes: REQUIRED_PLACEMENT_TYPES.filter(
      (type) => !placementTypes.has(type),
    ),
    duplicatePlacementTypes,
    questionIntegrity,
    qualityWarnings,
    blockers,
  };

  console.log(JSON.stringify(report, null, 2));
  if (!report.ready) process.exitCode = 1;
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

async function getQuestionIntegrityReport() {
  const choiceTypes = [
    QuestQuestionType.SINGLE_CHOICE,
    QuestQuestionType.MULTIPLE_SELECT,
    QuestQuestionType.BINARY_CHOICE,
    QuestQuestionType.IMAGE_CHOICE,
    QuestQuestionType.AUDIO_CHOICE,
  ];
  const [
    activeChoiceWithoutOptions,
    activeChoiceWithoutCorrect,
    shortTextWithoutAccepted,
    matchingWithoutPairs,
    orderingWithoutItems,
    hotspotWithoutAreas,
    evidenceWithoutItems,
    longTextWithoutRubric,
  ] = await Promise.all([
    prisma.questQuestion.count({
      where: {
        status: "ACTIVE",
        questionType: { in: choiceTypes },
        options: { none: {} },
      },
    }),
    prisma.questQuestion.count({
      where: {
        status: "ACTIVE",
        questionType: { in: choiceTypes },
        options: { none: { isCorrect: true } },
      },
    }),
    prisma.questQuestion.count({
      where: {
        status: "ACTIVE",
        questionType: QuestQuestionType.SHORT_TEXT,
        acceptedAnswers: { none: {} },
      },
    }),
    prisma.questQuestion.count({
      where: {
        status: "ACTIVE",
        questionType: QuestQuestionType.MATCHING,
        matchingPairs: { none: {} },
      },
    }),
    prisma.questQuestion.count({
      where: {
        status: "ACTIVE",
        questionType: {
          in: [QuestQuestionType.ORDERING, QuestQuestionType.TIMELINE_BUILDER],
        },
        orderItems: { none: {} },
      },
    }),
    prisma.questQuestion.count({
      where: {
        status: "ACTIVE",
        questionType: QuestQuestionType.IMAGE_HOTSPOT,
        hotspotAreas: { none: {} },
      },
    }),
    prisma.questQuestion.count({
      where: {
        status: "ACTIVE",
        questionType: QuestQuestionType.EVIDENCE_BOARD,
        evidenceItems: { none: {} },
      },
    }),
    prisma.questQuestion.count({
      where: {
        status: "ACTIVE",
        questionType: {
          in: [QuestQuestionType.LONG_TEXT, QuestQuestionType.VOICE_RESPONSE],
        },
        rubricCriteria: { none: {} },
      },
    }),
  ]);
  const blockers = [
    activeChoiceWithoutOptions > 0
      ? `${activeChoiceWithoutOptions} soal pilihan aktif belum punya opsi.`
      : null,
    activeChoiceWithoutCorrect > 0
      ? `${activeChoiceWithoutCorrect} soal pilihan aktif belum punya kunci benar.`
      : null,
    shortTextWithoutAccepted > 0
      ? `${shortTextWithoutAccepted} soal short text aktif belum punya accepted answer.`
      : null,
    matchingWithoutPairs > 0
      ? `${matchingWithoutPairs} soal matching aktif belum punya pasangan.`
      : null,
    orderingWithoutItems > 0
      ? `${orderingWithoutItems} soal ordering/timeline aktif belum punya item.`
      : null,
    hotspotWithoutAreas > 0
      ? `${hotspotWithoutAreas} soal hotspot aktif belum punya area.`
      : null,
    evidenceWithoutItems > 0
      ? `${evidenceWithoutItems} soal evidence aktif belum punya item.`
      : null,
    longTextWithoutRubric > 0
      ? `${longTextWithoutRubric} soal long text/voice aktif belum punya rubrik.`
      : null,
  ].filter((message): message is string => Boolean(message));

  return {
    activeChoiceWithoutOptions,
    activeChoiceWithoutCorrect,
    shortTextWithoutAccepted,
    matchingWithoutPairs,
    orderingWithoutItems,
    hotspotWithoutAreas,
    evidenceWithoutItems,
    longTextWithoutRubric,
    blockers,
  };
}
