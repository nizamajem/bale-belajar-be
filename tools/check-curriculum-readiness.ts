import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const MIN_ACTIVE_QUESTS_PER_WORLD = 5;
const MIN_ACTIVE_QUESTIONS = 20;
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
  const [worlds, activeQuestCount, activeQuestionCount, templates, sourceRows] =
    await Promise.all([
      prisma.world.findMany({
        where: { isActive: true },
        orderBy: { orderNumber: "asc" },
        include: {
          subject: { select: { name: true } },
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
        select: { questionType: true },
      }),
      prisma.curriculumSourceRecord.count(),
    ]);

  const placementTypes = new Set(
    templates.map((template) => template.questionType),
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
    ...REQUIRED_PLACEMENT_TYPES.filter((type) => !placementTypes.has(type)).map(
      (type) => `Template placement ${type} belum tersedia.`,
    ),
  ];

  const report = {
    ready: blockers.length === 0,
    counts: {
      sourceRows,
      activeWorlds: worlds.length,
      activeQuests: activeQuestCount,
      activeQuestions: activeQuestionCount,
      placementTemplates: templates.length,
    },
    worlds: worlds.map((world) => ({
      key: world.key,
      subject: world.subject.name,
      chapters: world._count.chapters,
      activeQuests: world._count.quests,
      ready:
        world._count.chapters > 0 &&
        world._count.quests >= MIN_ACTIVE_QUESTS_PER_WORLD,
    })),
    missingPlacementTypes: REQUIRED_PLACEMENT_TYPES.filter(
      (type) => !placementTypes.has(type),
    ),
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
