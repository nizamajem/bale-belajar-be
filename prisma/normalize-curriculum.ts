import {
  CurriculumLessonType,
  CurriculumModuleStatus,
  MissionStatus,
  Prisma,
  PrismaClient,
  QuestQuestionType,
  QuestionStatus,
} from "@prisma/client";

const prisma = new PrismaClient();

type Row = Record<string, string>;

type CurriculumLessonSeed = {
  orderNumber: number;
  type: CurriculumLessonType;
  title: string;
  body: string;
  examples: string[];
  items: string[];
};

function compactStrings(values: Array<string | undefined | null>): string[] {
  return values.filter((value): value is string =>
    Boolean(value && value.trim()),
  );
}

function str(row: Row, key: string): string | undefined {
  const v = row[key];
  return v === undefined || v === "" ? undefined : v;
}

function num(row: Row, key: string): number | undefined {
  const v = row[key];
  if (v === undefined || v === "") return undefined;
  const cleaned = v.replace("%", "").trim();
  const n = Number(cleaned);
  return Number.isNaN(n) ? undefined : n;
}

function int(row: Row, key: string): number | undefined {
  const n = num(row, key);
  return n === undefined ? undefined : Math.round(n);
}

function bool(row: Row, key: string): boolean {
  const v = row[key];
  return v === "Yes" || v === "yes" || v === "true" || v === "TRUE";
}

function optBool(row: Row, key: string): boolean | undefined {
  return row[key] === undefined ? undefined : bool(row, key);
}

function csv(row: Row, key: string): string[] {
  const v = row[key];
  if (!v) return [];
  return v
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "materi"
  );
}

function json(row: Row, key: string): Prisma.InputJsonValue | undefined {
  const v = row[key];
  if (!v) return undefined;
  try {
    return JSON.parse(v) as Prisma.InputJsonValue;
  } catch {
    return undefined;
  }
}

function buildCurriculumLessons(input: {
  worldName: string;
  chapterTitle: string;
  chapterStory?: string | null;
  competencyName: string;
  competencyDescription?: string | null;
  moduleGoal: string;
  focusItems: string[];
  examples: string[];
}): CurriculumLessonSeed[] {
  const focusItems = input.focusItems.length
    ? input.focusItems
    : [
        `Menjelaskan inti ${input.competencyName} dengan kalimat sendiri.`,
        "Menandai informasi penting pada soal atau cerita.",
        "Memilih jawaban berdasarkan alasan yang bisa dijelaskan.",
      ];
  const examples = input.examples.length
    ? input.examples
    : [
        `Saat berada di ${input.chapterTitle}, baca situasi, temukan kata kunci, lalu hubungkan dengan ${input.competencyName}.`,
        "Singkirkan pilihan yang tidak sesuai dengan informasi pada soal.",
      ];

  return [
    {
      orderNumber: 1,
      type: CurriculumLessonType.CONCEPT,
      title: `Inti materi: ${input.competencyName}`,
      body: compactStrings([
        input.chapterStory ?? undefined,
        input.moduleGoal,
        input.competencyDescription ?? undefined,
      ]).join("\n\n"),
      examples: examples.slice(0, 2),
      items: [],
    },
    {
      orderNumber: 2,
      type: CurriculumLessonType.CONCEPT,
      title: "Kosakata penting",
      body: `Pahami kata-kata kunci sebelum masuk quest agar instruksi di ${input.worldName} lebih mudah dibaca.`,
      examples: [],
      items: [
        `Konsep utama: ${input.competencyName}.`,
        `Tujuan misi: ${input.moduleGoal}.`,
        "Petunjuk: informasi yang membantu menentukan jawaban.",
        "Pengecoh: pilihan atau detail yang terlihat menarik tetapi tidak menjawab pertanyaan.",
      ],
    },
    {
      orderNumber: 3,
      type: CurriculumLessonType.CONCEPT,
      title: "Langkah memahami soal",
      body: "Gunakan urutan sederhana ini setiap kali menemukan pertanyaan baru.",
      examples: [],
      items: [
        "Baca cerita atau instruksi sampai selesai.",
        "Tandai angka, kata kunci, bukti, atau aturan yang diberikan.",
        `Cocokkan informasi dengan ${input.competencyName}.`,
        "Cek setiap pilihan jawaban dan coret yang tidak cocok.",
        "Pilih jawaban yang paling kuat alasannya.",
      ],
    },
    {
      orderNumber: 4,
      type: CurriculumLessonType.EXAMPLE,
      title: "Contoh penerapan",
      body: `Bayangkan kamu menjalankan misi di ${input.chapterTitle}. Mulai dari informasi yang diketahui, gunakan konsep, lalu jelaskan kenapa pilihanmu paling tepat.`,
      examples: examples.slice(0, 4),
      items: [],
    },
    {
      orderNumber: 5,
      type: CurriculumLessonType.PROFESSIONAL_HABIT,
      title: "Kebiasaan belajar",
      body: "Kebiasaan ini membuat jawaban lebih rapi dan tidak asal tebak.",
      examples: [],
      items: [
        "Ucapkan ulang pertanyaan dengan kata-katamu sendiri.",
        "Tulis alasan singkat sebelum memilih jawaban.",
        "Cek apakah jawabanmu sesuai semua informasi penting.",
        "Kalau ragu, cari pilihan yang paling sedikit bertentangan dengan soal.",
      ],
    },
    {
      orderNumber: 6,
      type: CurriculumLessonType.CHECKLIST,
      title: "Checklist siap quest",
      body: "Kalau sebagian besar sudah bisa, kamu siap mulai quest.",
      examples: [],
      items: focusItems.slice(0, 7),
    },
    {
      orderNumber: 7,
      type: CurriculumLessonType.EXAMPLE,
      title: "Latihan mini sebelum quest",
      body: `Coba jawab secara lisan: apa inti ${input.competencyName}, informasi apa yang harus dicari, dan kesalahan apa yang harus dihindari?`,
      examples: [
        `Aku memakai ${input.competencyName} untuk membaca petunjuk dan memilih strategi.`,
        "Jawabanku harus punya alasan, bukan hanya menebak pilihan yang terlihat benar.",
      ],
      items: [
        "Sebutkan satu kata kunci materi.",
        "Sebutkan satu contoh informasi penting.",
        "Sebutkan satu kesalahan umum yang harus dihindari.",
      ],
    },
    {
      orderNumber: 8,
      type: CurriculumLessonType.RUBRIC,
      title: "Jawaban bagus dinilai dari",
      body: "Gunakan rubrik ini untuk mengecek kualitas jawabanmu.",
      examples: [],
      items: [
        "Jawaban sesuai instruksi.",
        "Jawaban memakai informasi dari soal.",
        "Alasan jawaban bisa dijelaskan.",
        "Tidak memilih karena tebakan semata.",
        "Bisa memperbaiki jawaban setelah melihat pembahasan.",
      ],
    },
    {
      orderNumber: 9,
      type: CurriculumLessonType.MASTERY_PATH,
      title: "Jalur naik level",
      body: `Setelah menguasai ${input.competencyName}, lanjutkan ke tantangan yang lebih mandiri.`,
      examples: [],
      items: [
        "Mengerjakan soal serupa tanpa bantuan.",
        "Menjelaskan alasan jawaban kepada teman.",
        "Membuat contoh soal sendiri.",
        "Menyelesaikan quest dengan skor lebih tinggi.",
      ],
    },
  ];
}

async function ensureCurriculumModulesForAllWorlds(
  stats: Record<string, number>,
) {
  const worlds = await prisma.world.findMany({
    where: { isActive: true },
    orderBy: { orderNumber: "asc" },
    include: {
      chapters: {
        orderBy: { chapterNumber: "asc" },
        include: {
          competencies: { orderBy: { orderNumber: "asc" } },
        },
      },
      curriculumModules: {
        orderBy: { orderNumber: "asc" },
        include: {
          lessons: true,
          caseStudies: true,
          remedialRules: true,
        },
      },
    },
  });

  let createdModules = 0;
  let updatedModules = 0;
  let lessonUpserts = 0;
  let caseStudyUpserts = 0;
  let remedialRuleUpserts = 0;

  for (const world of worlds) {
    let nextOrder =
      world.curriculumModules.reduce(
        (max, module) => Math.max(max, module.orderNumber),
        0,
      ) + 1;

    for (const chapter of world.chapters) {
      for (const competency of chapter.competencies) {
        const existingModule =
          world.curriculumModules.find(
            (module) => module.competencyId === competency.id,
          ) ??
          (await prisma.curriculumModule.findFirst({
            where: { worldId: world.id, competencyId: competency.id },
          }));
        const slug = `auto-${slugify(competency.code)}`;
        const simpleGoal =
          competency.description ??
          chapter.goal ??
          `Memahami ${competency.name} dan memakainya saat mengerjakan quest.`;
        const moduleData = {
          competencyId: competency.id,
          title: competency.name,
          simpleGoal,
          bigIdea: chapter.goal ?? simpleGoal,
          estimatedMinutes: 20,
          status: CurriculumModuleStatus.ACTIVE,
        };
        const module = existingModule
          ? await prisma.curriculumModule.update({
              where: { id: existingModule.id },
              data: moduleData,
            })
          : await prisma.curriculumModule.create({
              data: {
                worldId: world.id,
                slug,
                orderNumber: nextOrder++,
                ...moduleData,
              },
            });
        if (existingModule) updatedModules += 1;
        else createdModules += 1;

        const lessons = buildCurriculumLessons({
          worldName: world.name,
          chapterTitle: chapter.title,
          chapterStory: chapter.story,
          competencyName: competency.name,
          competencyDescription: competency.description,
          moduleGoal: simpleGoal,
          focusItems: [
            `Menjelaskan ide utama ${competency.name} dengan kalimat sendiri.`,
            "Membaca instruksi soal sampai selesai sebelum menjawab.",
            "Menandai informasi penting sebelum memilih jawaban.",
            "Memilih jawaban berdasarkan bukti atau langkah kerja, bukan tebakan.",
            "Menyebutkan alasan kenapa pilihan lain kurang tepat.",
            "Memperbaiki strategi belajar setelah melihat hasil quest.",
          ],
          examples: compactStrings([
            chapter.goal,
            competency.description,
            "Tandai kata kunci pada stimulus.",
            "Hubungkan pertanyaan dengan konsep yang baru dibaca.",
            "Periksa ulang jawaban sebelum lanjut.",
          ]),
        });

        for (const lesson of lessons) {
          await prisma.curriculumLesson.upsert({
            where: {
              moduleId_orderNumber: {
                moduleId: module.id,
                orderNumber: lesson.orderNumber,
              },
            },
            create: { moduleId: module.id, ...lesson },
            update: lesson,
          });
          lessonUpserts += 1;
        }

        await prisma.curriculumCaseStudy.upsert({
          where: {
            moduleId_orderNumber: { moduleId: module.id, orderNumber: 1 },
          },
          create: {
            moduleId: module.id,
            orderNumber: 1,
            title: `Kasus latihan: ${chapter.title}`,
            story:
              chapter.story ??
              `Ada tantangan di ${world.name}. Gunakan ${competency.name} untuk menentukan langkah yang paling masuk akal.`,
            analysisSteps: [
              "Baca situasi dan cari informasi penting.",
              `Hubungkan informasi dengan ${competency.name}.`,
              "Pilih jawaban yang paling didukung oleh bukti.",
            ],
            commonMistake:
              "Menjawab terlalu cepat tanpa menghubungkan petunjuk dengan konsep.",
          },
          update: {
            title: `Kasus latihan: ${chapter.title}`,
            story:
              chapter.story ??
              `Ada tantangan di ${world.name}. Gunakan ${competency.name} untuk menentukan langkah yang paling masuk akal.`,
            analysisSteps: [
              "Baca situasi dan cari informasi penting.",
              `Hubungkan informasi dengan ${competency.name}.`,
              "Pilih jawaban yang paling didukung oleh bukti.",
            ],
            commonMistake:
              "Menjawab terlalu cepat tanpa menghubungkan petunjuk dengan konsep.",
          },
        });
        caseStudyUpserts += 1;

        await prisma.curriculumCaseStudy.upsert({
          where: {
            moduleId_orderNumber: { moduleId: module.id, orderNumber: 2 },
          },
          create: {
            moduleId: module.id,
            orderNumber: 2,
            title: `Latihan refleksi: ${competency.name}`,
            story: `Setelah menyelesaikan materi ${competency.name}, Babe meminta kamu menjelaskan cara memilih jawaban tanpa menebak.`,
            analysisSteps: [
              "Sebutkan konsep yang dipakai.",
              "Ambil satu informasi penting dari soal.",
              "Jelaskan kenapa jawabanmu paling sesuai.",
              "Catat bagian yang masih membingungkan untuk dipelajari ulang.",
            ],
            commonMistake:
              "Merasa yakin hanya karena jawaban terlihat familiar, bukan karena cocok dengan informasi pada soal.",
          },
          update: {
            title: `Latihan refleksi: ${competency.name}`,
            story: `Setelah menyelesaikan materi ${competency.name}, Babe meminta kamu menjelaskan cara memilih jawaban tanpa menebak.`,
            analysisSteps: [
              "Sebutkan konsep yang dipakai.",
              "Ambil satu informasi penting dari soal.",
              "Jelaskan kenapa jawabanmu paling sesuai.",
              "Catat bagian yang masih membingungkan untuk dipelajari ulang.",
            ],
            commonMistake:
              "Merasa yakin hanya karena jawaban terlihat familiar, bukan karena cocok dengan informasi pada soal.",
          },
        });
        caseStudyUpserts += 1;

        const existingRule = await prisma.remedialRule.findFirst({
          where: {
            moduleId: module.id,
            recommendationTitle: `Latihan ulang ${competency.name}`,
          },
        });
        const remedialData = {
          competencyId: competency.id,
          minScoreExclusive: 60,
          recommendationTitle: `Latihan ulang ${competency.name}`,
          recommendationMessage:
            "Baca kembali inti materi, kerjakan contoh cara berpikir, lalu ulangi quest serupa.",
          actionType: "RETRY_TEMPLATE_QUEST",
        };
        if (existingRule) {
          await prisma.remedialRule.update({
            where: { id: existingRule.id },
            data: remedialData,
          });
        } else {
          await prisma.remedialRule.create({
            data: { moduleId: module.id, ...remedialData },
          });
        }
        remedialRuleUpserts += 1;
      }
    }
  }

  stats.CurriculumModuleFallbackCreated = createdModules;
  stats.CurriculumModuleFallbackUpdated = updatedModules;
  stats.CurriculumLessonFallbackUpsert = lessonUpserts;
  stats.CurriculumCaseStudyFallbackUpsert = caseStudyUpserts;
  stats.RemedialRuleFallbackUpsert = remedialRuleUpserts;
}

function orderItemLabel(
  questionId: string,
  row: Row,
  optionLabelByQuestionAndId: Map<string, string>,
  index: number,
) {
  const direct =
    row.label ?? row.text ?? row.title ?? row.name ?? row.description;
  if (direct?.trim()) return direct.trim();

  const itemId = row.item_id ?? String(index);
  const optionId = itemId.includes("_") ? itemId.split("_").at(-1) : itemId;
  const optionLabel =
    optionLabelByQuestionAndId.get(`${questionId}:${itemId}`) ??
    (optionId
      ? optionLabelByQuestionAndId.get(`${questionId}:${optionId}`)
      : undefined);
  return optionLabel ?? itemId;
}

// questionType di curriculum-data.json memakai camelCase ("audioChoice"),
// enum Prisma QuestQuestionType memakai SCREAMING_SNAKE ("AUDIO_CHOICE") -
// sama persis konvensi payload string QuestionType di Flutter, jadi cukup
// transform sekali di sini, tidak perlu tabel mapping manual.
const PLACEMENT_TYPE_ORDER = [
  QuestQuestionType.SINGLE_CHOICE,
  QuestQuestionType.MULTIPLE_SELECT,
  QuestQuestionType.BINARY_CHOICE,
  QuestQuestionType.SHORT_TEXT,
  QuestQuestionType.MATCHING,
  QuestQuestionType.ORDERING,
  QuestQuestionType.IMAGE_CHOICE,
  QuestQuestionType.AUDIO_CHOICE,
  QuestQuestionType.LONG_TEXT,
  QuestQuestionType.CODE_INPUT,
  QuestQuestionType.IMAGE_HOTSPOT,
  QuestQuestionType.VOICE_RESPONSE,
  QuestQuestionType.TIMELINE_BUILDER,
  QuestQuestionType.EVIDENCE_BOARD,
];

function toQuestionType(value: string): QuestQuestionType | undefined {
  const snake = value.replace(/([A-Z])/g, "_$1").toUpperCase();
  return Object.values(QuestQuestionType).includes(snake as QuestQuestionType)
    ? (snake as QuestQuestionType)
    : undefined;
}

async function loadSheet(sheetName: string): Promise<Row[]> {
  const records = await prisma.curriculumSourceRecord.findMany({
    where: { sheetName },
    orderBy: { rowNumber: "asc" },
  });
  return records.map((r) => r.payload as Row);
}

async function main() {
  const [
    worldRows,
    subWorldRows,
    chapterRows,
    competencyRows,
    subCompetencyRows,
    missionRows,
    questionRows,
    typeConfigRows,
    optionRows,
    matchingRows,
    orderRows,
    acceptedRows,
    rubricRows,
    mediaRows,
    hotspotRows,
    evidenceRows,
    codeConfigRows,
  ] = await Promise.all([
    loadSheet("WORLD_MASTER"),
    loadSheet("SUB_WORLD"),
    loadSheet("CHAPTER_MASTER"),
    loadSheet("COMPETENCY_MASTER"),
    loadSheet("SUBCOMPETENCY"),
    loadSheet("DAILY_MISSION_TEMPLATE"),
    loadSheet("QUESTION_BANK"),
    loadSheet("QUESTION_TYPE_CONFIG"),
    loadSheet("QUESTION_OPTIONS"),
    loadSheet("MATCHING_PAIRS"),
    loadSheet("ORDER_TIMELINE_ITEMS"),
    loadSheet("ACCEPTED_ANSWERS"),
    loadSheet("RUBRIC_CRITERIA"),
    loadSheet("QUESTION_MEDIA"),
    loadSheet("HOTSPOT_AREAS"),
    loadSheet("EVIDENCE_ITEMS"),
    loadSheet("CODE_CONFIG"),
  ]);

  const stats: Record<string, number> = {};

  // 1. Subject + World -----------------------------------------------------
  const worldBySourceId = new Map<string, { id: string; key: string }>();
  for (const w of worldRows) {
    if (!w.world_id) continue;
    const subject = await prisma.subject.upsert({
      where: { code: w.world_id },
      create: {
        code: w.world_id,
        name: w.world_name ?? w.world_id,
        description: str(w, "description"),
      },
      update: {
        name: w.world_name ?? w.world_id,
        description: str(w, "description"),
      },
    });
    const key = (w.world_name ?? w.world_id).toLowerCase();
    const world = await prisma.world.upsert({
      where: { key },
      create: {
        key,
        subjectId: subject.id,
        name: w.world_name ?? w.world_id,
        characterClass: str(w, "subject") ?? "Explorer",
        themeDescription: str(w, "lore"),
        isActive: true,
      },
      update: {
        name: w.world_name ?? w.world_id,
        themeDescription: str(w, "lore"),
      },
    });
    worldBySourceId.set(w.world_id, world);
  }
  stats.World = worldBySourceId.size;

  const subWorldBySourceId = new Map(
    subWorldRows.map((r) => [r.sub_world_id, r]),
  );

  // 2. Chapter ---------------------------------------------------------------
  const chapterBySourceId = new Map<
    string,
    {
      id: string;
      worldId: string;
      chapterNumber: number;
      title: string;
      story?: string;
      goal?: string;
    }
  >();
  for (const c of chapterRows) {
    if (!c.chapter_id) continue;
    const subWorld = subWorldBySourceId.get(c.sub_world_id ?? "");
    const world = subWorld ? worldBySourceId.get(subWorld.world_id) : undefined;
    if (!world) {
      console.warn(
        `Skip chapter ${c.chapter_id}: World untuk sub_world_id "${c.sub_world_id}" tidak ketemu.`,
      );
      continue;
    }
    const chapter = await prisma.chapter.upsert({
      where: { chapterCode: c.chapter_id },
      create: {
        chapterCode: c.chapter_id,
        worldId: world.id,
        subWorldKey: subWorld?.sub_world_id,
        subWorldName: subWorld?.name,
        chapterNumber: int(c, "chapter_number") ?? 1,
        title: c.chapter_title ?? c.chapter_id,
        story: str(c, "chapter_story"),
        difficulty: str(c, "difficulty"),
        estimatedDurationDays: int(c, "estimated_duration_days"),
        recommendedSessions: int(c, "recommended_sessions"),
        goal: str(c, "chapter_goal"),
        completionIndicator: str(c, "completion_indicator"),
        bossMissionUnlockMasteryPct: num(c, "boss_mission_unlock_mastery"),
        status: MissionStatus.ACTIVE,
      },
      update: {
        title: c.chapter_title ?? c.chapter_id,
        story: str(c, "chapter_story"),
        difficulty: str(c, "difficulty"),
        estimatedDurationDays: int(c, "estimated_duration_days"),
        recommendedSessions: int(c, "recommended_sessions"),
        goal: str(c, "chapter_goal"),
        completionIndicator: str(c, "completion_indicator"),
        bossMissionUnlockMasteryPct: num(c, "boss_mission_unlock_mastery"),
        status: MissionStatus.ACTIVE,
      },
    });
    chapterBySourceId.set(c.chapter_id, {
      id: chapter.id,
      worldId: world.id,
      chapterNumber: chapter.chapterNumber,
      title: chapter.title,
      story: chapter.story ?? undefined,
      goal: chapter.goal ?? undefined,
    });
  }
  stats.Chapter = chapterBySourceId.size;

  // 3. Competency + SubCompetency --------------------------------------------
  const competencyBySourceId = new Map<
    string,
    {
      id: string;
      subjectId: string;
      chapterId: string;
      code: string;
      name: string;
      description?: string;
    }
  >();
  let competencyOrder = 0;
  for (const comp of competencyRows) {
    if (!comp.competency_id) continue;
    const chapter = chapterBySourceId.get(comp.chapter_id ?? "");
    if (!chapter) {
      console.warn(
        `Skip competency ${comp.competency_id}: Chapter "${comp.chapter_id}" tidak ketemu.`,
      );
      continue;
    }
    const chapterFull = await prisma.chapter.findUniqueOrThrow({
      where: { id: chapter.id },
      select: { worldId: true },
    });
    const world = await prisma.world.findUniqueOrThrow({
      where: { id: chapterFull.worldId },
      select: { subjectId: true },
    });
    competencyOrder += 1;
    const competency = await prisma.competency.upsert({
      where: {
        subjectId_code: {
          subjectId: world.subjectId,
          code: comp.competency_id,
        },
      },
      create: {
        subjectId: world.subjectId,
        chapterId: chapter.id,
        code: comp.competency_id,
        name: comp.competency_name ?? comp.competency_id,
        description: str(comp, "description"),
        orderNumber: int(comp, "sequence_number") ?? competencyOrder,
      },
      update: {
        chapterId: chapter.id,
        name: comp.competency_name ?? comp.competency_id,
        description: str(comp, "description"),
      },
    });
    competencyBySourceId.set(comp.competency_id, {
      id: competency.id,
      subjectId: competency.subjectId,
      chapterId: chapter.id,
      code: competency.code,
      name: competency.name,
      description: competency.description ?? undefined,
    });
  }
  stats.Competency = competencyBySourceId.size;

  const subCompetencyBySourceId = new Map<
    string,
    {
      id: string;
      competencyId: string;
      code: string;
      name: string;
      learningObjective?: string;
      indicator?: string;
    }
  >();
  let subCompetencyOrder = 0;
  for (const sub of subCompetencyRows) {
    if (!sub.subcompetency_id) continue;
    const competency = competencyBySourceId.get(sub.competency_id ?? "");
    if (!competency) {
      console.warn(
        `Skip subcompetency ${sub.subcompetency_id}: Competency "${sub.competency_id}" tidak ketemu.`,
      );
      continue;
    }
    subCompetencyOrder += 1;
    const subCompetency = await prisma.subCompetency.upsert({
      where: {
        competencyId_code: {
          competencyId: competency.id,
          code: sub.subcompetency_id,
        },
      },
      create: {
        competencyId: competency.id,
        code: sub.subcompetency_id,
        name: sub.name ?? sub.subcompetency_id,
        description: str(sub, "learning_objective"),
        orderNumber: int(sub, "sequence_number") ?? subCompetencyOrder,
      },
      update: {
        name: sub.name ?? sub.subcompetency_id,
        description: str(sub, "learning_objective"),
      },
    });
    subCompetencyBySourceId.set(sub.subcompetency_id, {
      id: subCompetency.id,
      competencyId: competency.id,
      code: subCompetency.code,
      name: subCompetency.name,
      learningObjective: str(sub, "learning_objective"),
      indicator: str(sub, "indicator"),
    });
  }
  stats.SubCompetency = subCompetencyBySourceId.size;

  // 4. Materi kurikulum -------------------------------------------------------
  let moduleCount = 0;
  let lessonCount = 0;
  let caseStudyCount = 0;
  let remedialRuleCount = 0;
  const subCompetenciesByCompetencyId = new Map<
    string,
    typeof subCompetencyBySourceId extends Map<string, infer T> ? T[] : never
  >();
  for (const sub of subCompetencyBySourceId.values()) {
    const list = subCompetenciesByCompetencyId.get(sub.competencyId) ?? [];
    list.push(sub);
    subCompetenciesByCompetencyId.set(sub.competencyId, list);
  }
  const moduleOrderByWorldId = new Map<string, number>();

  for (const compRow of competencyRows) {
    if (!compRow.competency_id) continue;
    const competency = competencyBySourceId.get(compRow.competency_id);
    const chapter = chapterBySourceId.get(compRow.chapter_id ?? "");
    if (!competency || !chapter) continue;

    const nextOrder = (moduleOrderByWorldId.get(chapter.worldId) ?? 0) + 1;
    moduleOrderByWorldId.set(chapter.worldId, nextOrder);
    const moduleSlug = slugify(compRow.competency_id);
    const moduleTitle = competency.name;
    const moduleGoal =
      str(compRow, "description") ??
      chapter.goal ??
      `Memahami ${moduleTitle} dan menerapkannya dalam latihan.`;
    const module = await prisma.curriculumModule.upsert({
      where: { worldId_slug: { worldId: chapter.worldId, slug: moduleSlug } },
      create: {
        worldId: chapter.worldId,
        competencyId: competency.id,
        slug: moduleSlug,
        title: moduleTitle,
        simpleGoal: moduleGoal,
        bigIdea: chapter.goal ?? moduleGoal,
        orderNumber: 1000 + nextOrder,
        estimatedMinutes: 20,
        status: CurriculumModuleStatus.ACTIVE,
      },
      update: {
        competencyId: competency.id,
        title: moduleTitle,
        simpleGoal: moduleGoal,
        bigIdea: chapter.goal ?? moduleGoal,
        orderNumber: 1000 + nextOrder,
        estimatedMinutes: 20,
        status: CurriculumModuleStatus.ACTIVE,
      },
    });
    moduleCount += 1;

    const subCompetencies =
      subCompetenciesByCompetencyId.get(competency.id) ?? [];
    const checklistItems = subCompetencies.map(
      (sub) => sub.learningObjective ?? sub.indicator ?? `Kuasai ${sub.name}.`,
    );

    const lessons = buildCurriculumLessons({
      worldName: chapter.title,
      chapterTitle: chapter.title,
      chapterStory: chapter.story,
      competencyName: moduleTitle,
      competencyDescription: str(compRow, "description"),
      moduleGoal,
      focusItems: checklistItems.length ? checklistItems : [moduleGoal],
      examples: compactStrings([
        ...subCompetencies.map((sub) => sub.indicator),
        ...missionRows
          .filter((mission) => {
            const sub = subCompetencyBySourceId.get(
              mission.subcompetency_id ?? "",
            );
            return sub?.competencyId === competency.id;
          })
          .map((mission) => mission.objective),
      ]).slice(0, 6),
    });

    for (const lesson of lessons) {
      await prisma.curriculumLesson.upsert({
        where: {
          moduleId_orderNumber: {
            moduleId: module.id,
            orderNumber: lesson.orderNumber,
          },
        },
        create: { moduleId: module.id, ...lesson },
        update: lesson,
      });
      lessonCount += 1;
    }

    await prisma.curriculumCaseStudy.upsert({
      where: { moduleId_orderNumber: { moduleId: module.id, orderNumber: 1 } },
      create: {
        moduleId: module.id,
        orderNumber: 1,
        title: `Kasus singkat: ${chapter.title}`,
        story:
          chapter.story ??
          `Ada masalah di ${chapter.title}. Gunakan ${moduleTitle} untuk menemukan penyebabnya.`,
        analysisSteps: checklistItems.slice(0, 4),
        commonMistake: `Menjawab dari hafalan kata kunci tanpa menghubungkan struktur, fungsi, dan bukti pada soal.`,
      },
      update: {
        title: `Kasus singkat: ${chapter.title}`,
        story:
          chapter.story ??
          `Ada masalah di ${chapter.title}. Gunakan ${moduleTitle} untuk menemukan penyebabnya.`,
        analysisSteps: checklistItems.slice(0, 4),
        commonMistake: `Menjawab dari hafalan kata kunci tanpa menghubungkan struktur, fungsi, dan bukti pada soal.`,
      },
    });
    caseStudyCount += 1;

    await prisma.curriculumCaseStudy.upsert({
      where: { moduleId_orderNumber: { moduleId: module.id, orderNumber: 2 } },
      create: {
        moduleId: module.id,
        orderNumber: 2,
        title: `Refleksi mandiri: ${moduleTitle}`,
        story: `Kamu baru menyelesaikan materi ${moduleTitle}. Sekarang cek apakah jawabanmu sudah memakai informasi dari soal dan bukan sekadar hafalan.`,
        analysisSteps: [
          `Ulangi tujuan materi: ${moduleGoal}`,
          "Tulis satu informasi penting yang harus dicari.",
          "Tulis satu contoh jawaban yang punya alasan.",
          "Tentukan materi mana yang perlu dibaca ulang jika skor masih rendah.",
        ],
        commonMistake: `Menghafal kata kunci ${moduleTitle} tanpa menjelaskan alasan jawaban.`,
      },
      update: {
        title: `Refleksi mandiri: ${moduleTitle}`,
        story: `Kamu baru menyelesaikan materi ${moduleTitle}. Sekarang cek apakah jawabanmu sudah memakai informasi dari soal dan bukan sekadar hafalan.`,
        analysisSteps: [
          `Ulangi tujuan materi: ${moduleGoal}`,
          "Tulis satu informasi penting yang harus dicari.",
          "Tulis satu contoh jawaban yang punya alasan.",
          "Tentukan materi mana yang perlu dibaca ulang jika skor masih rendah.",
        ],
        commonMistake: `Menghafal kata kunci ${moduleTitle} tanpa menjelaskan alasan jawaban.`,
      },
    });
    caseStudyCount += 1;

    const existingRule = await prisma.remedialRule.findFirst({
      where: {
        moduleId: module.id,
        recommendationTitle: `Ulangi materi ${moduleTitle}`,
      },
    });
    const remedialData = {
      competencyId: competency.id,
      minScoreExclusive: 60,
      recommendationTitle: `Ulangi materi ${moduleTitle}`,
      recommendationMessage: `Baca ringkasan materi, cek daftar kemampuan, lalu kerjakan latihan serupa sampai bukti pemahaman cukup.`,
      actionType: "RETRY_TEMPLATE_QUEST",
    };
    if (existingRule) {
      await prisma.remedialRule.update({
        where: { id: existingRule.id },
        data: remedialData,
      });
    } else {
      await prisma.remedialRule.create({
        data: { moduleId: module.id, ...remedialData },
      });
    }
    remedialRuleCount += 1;
  }
  stats.CurriculumModule = moduleCount;
  stats.CurriculumLesson = lessonCount;
  stats.CurriculumCaseStudy = caseStudyCount;
  stats.RemedialRule = remedialRuleCount;
  await ensureCurriculumModulesForAllWorlds(stats);

  // 5. Quest (Daily Mission Template) ----------------------------------------
  const questBySourceId = new Map<string, { id: string }>();
  for (const m of missionRows) {
    if (!m.mission_id) continue;
    const chapter = chapterBySourceId.get(m.chapter_id ?? "");
    if (!chapter) {
      console.warn(
        `Skip quest ${m.mission_id}: Chapter "${m.chapter_id}" tidak ketemu.`,
      );
      continue;
    }
    const chapterFull = await prisma.chapter.findUniqueOrThrow({
      where: { id: chapter.id },
      select: { worldId: true },
    });
    const subCompetency = subCompetencyBySourceId.get(m.subcompetency_id ?? "");
    const hints = [str(m, "hint_1"), str(m, "hint_2"), str(m, "hint_3")].filter(
      (h): h is string => Boolean(h),
    );
    const quest = await prisma.quest.upsert({
      where: { code: m.mission_id },
      create: {
        code: m.mission_id,
        worldId: chapterFull.worldId,
        chapterId: chapter.id,
        subCompetencyId: subCompetency?.id,
        title: m.mission_title ?? m.mission_id,
        missionType: str(m, "mission_type"),
        story: str(m, "mission_story"),
        objective: str(m, "objective"),
        studentInstruction: str(m, "student_instruction"),
        estimatedMinutes: int(m, "duration_minutes") ?? 10,
        xpRewardFirst: int(m, "xp_reward_first") ?? 0,
        xpMultiplierSecond: num(m, "xp_multiplier_second"),
        xpMultiplierThirdPlus: num(m, "xp_multiplier_third_plus"),
        hints,
        status: MissionStatus.ACTIVE,
      },
      update: {
        title: m.mission_title ?? m.mission_id,
        story: str(m, "mission_story"),
        objective: str(m, "objective"),
        studentInstruction: str(m, "student_instruction"),
        estimatedMinutes: int(m, "duration_minutes") ?? 10,
        xpRewardFirst: int(m, "xp_reward_first") ?? 0,
        xpMultiplierSecond: num(m, "xp_multiplier_second"),
        xpMultiplierThirdPlus: num(m, "xp_multiplier_third_plus"),
        hints,
        status: MissionStatus.ACTIVE,
      },
    });
    questBySourceId.set(m.mission_id, quest);
  }
  stats.Quest = questBySourceId.size;

  // 5. QuestQuestion (skip baris yang cuma dipakai assessment_id / Cek Paham -
  //    di luar scope, lihat plan implementasi) ------------------------------
  const typeConfigByQuestionId = new Map(
    typeConfigRows.map((r) => [r.question_id, r]),
  );
  const questionBySourceId = new Map<string, { id: string }>();
  const orderCounter = new Map<string, number>();
  let skippedAssessmentOnly = 0;
  for (const q of questionRows) {
    if (!q.question_id) continue;
    const quest = questBySourceId.get(q.mission_id ?? "");
    if (!quest) {
      skippedAssessmentOnly += 1;
      continue;
    }
    const competency = competencyBySourceId.get(q.competency_id ?? "");
    if (!competency) {
      console.warn(
        `Skip question ${q.question_id}: Competency "${q.competency_id}" tidak ketemu.`,
      );
      continue;
    }
    const questionType = toQuestionType(q.question_type ?? "");
    if (!questionType) {
      console.warn(
        `Skip question ${q.question_id}: question_type "${q.question_type}" tidak dikenal.`,
      );
      continue;
    }
    const subCompetency = subCompetencyBySourceId.get(q.subcompetency_id ?? "");
    const typeConfig = typeConfigByQuestionId.get(q.question_id) ?? {};
    const order = (orderCounter.get(quest.id) ?? 0) + 1;
    orderCounter.set(quest.id, order);

    const question = await prisma.questQuestion.upsert({
      where: { code: q.question_id },
      create: {
        code: q.question_id,
        questId: quest.id,
        questionType,
        competencyId: competency.id,
        subCompetencyId: subCompetency?.id,
        measurementCategory: str(q, "measurement_category"),
        difficulty: str(q, "difficulty"),
        bloomLevel: str(q, "bloom_level"),
        orderNumber: order,
        questionText: q.question_text ?? "",
        stimulusText: str(q, "stimulus_text"),
        instruction: str(q, "instruction"),
        skillTags: csv(q, "skill_tags"),
        masteryPoint: int(q, "mastery_point"),
        xpReward: int(q, "xp_reward"),
        estimatedTimeSeconds: int(q, "estimated_time_seconds"),
        inputMode: str(typeConfig, "input_mode"),
        maxLength: int(typeConfig, "max_length"),
        caseSensitive: optBool(typeConfig, "case_sensitive"),
        allowEmpty: optBool(typeConfig, "allow_empty"),
        allowUnit: optBool(typeConfig, "allow_unit"),
        scoringConfig: str(typeConfig, "scoring_config"),
        sampleAnswer: str(typeConfig, "sample_answer"),
        status: QuestionStatus.ACTIVE,
      },
      update: {
        questionType,
        measurementCategory: str(q, "measurement_category"),
        difficulty: str(q, "difficulty"),
        bloomLevel: str(q, "bloom_level"),
        questionText: q.question_text ?? "",
        stimulusText: str(q, "stimulus_text"),
        instruction: str(q, "instruction"),
        skillTags: csv(q, "skill_tags"),
        masteryPoint: int(q, "mastery_point"),
        xpReward: int(q, "xp_reward"),
        estimatedTimeSeconds: int(q, "estimated_time_seconds"),
        inputMode: str(typeConfig, "input_mode"),
        maxLength: int(typeConfig, "max_length"),
        caseSensitive: optBool(typeConfig, "case_sensitive"),
        allowEmpty: optBool(typeConfig, "allow_empty"),
        allowUnit: optBool(typeConfig, "allow_unit"),
        scoringConfig: str(typeConfig, "scoring_config"),
        sampleAnswer: str(typeConfig, "sample_answer"),
        status: QuestionStatus.ACTIVE,
      },
    });
    questionBySourceId.set(q.question_id, question);
  }
  stats.QuestQuestion = questionBySourceId.size;
  stats.QuestQuestion_skipped_assessment_only = skippedAssessmentOnly;

  // 6. Sembilan tabel anak per tipe soal - delete+recreate per pertanyaan
  //    supaya script aman dijalankan berkali-kali (idempotent) tanpa perlu
  //    natural unique key di tiap baris anak. --------------------------------
  const byQuestion = <T extends { question_id: string }>(rows: T[]) => {
    const map = new Map<string, T[]>();
    for (const row of rows) {
      if (!row.question_id) continue;
      const list = map.get(row.question_id) ?? [];
      list.push(row);
      map.set(row.question_id, list);
    }
    return map;
  };

  const optionsByQuestion = byQuestion(
    optionRows as (Row & { question_id: string })[],
  );
  const optionLabelByQuestionAndId = new Map<string, string>();
  let optionCount = 0;
  for (const [sourceQuestionId, rows] of optionsByQuestion) {
    const question = questionBySourceId.get(sourceQuestionId);
    if (!question) continue;
    for (const row of rows) {
      if (!row.option_id) continue;
      optionLabelByQuestionAndId.set(
        `${sourceQuestionId}:${row.option_id}`,
        row.label ??
          row.text ??
          row.title ??
          row.name ??
          row.description ??
          row.option_id,
      );
    }
    await prisma.questQuestionOption.deleteMany({
      where: { questQuestionId: question.id },
    });
    await prisma.questQuestionOption.createMany({
      data: rows.map((r, i) => ({
        questQuestionId: question.id,
        optionId: r.option_id ?? String(i),
        label: r.label ?? "",
        description: str(r, "description"),
        imageUrl: str(r, "image_url"),
        isCorrect: bool(r, "is_correct"),
        misconception: str(r, "misconception"),
        displayOrder: int(r, "display_order") ?? i + 1,
      })),
    });
    optionCount += rows.length;
  }
  stats.QuestQuestionOption = optionCount;

  const matchingByQuestion = byQuestion(
    matchingRows as (Row & { question_id: string })[],
  );
  let matchingCount = 0;
  for (const [sourceQuestionId, rows] of matchingByQuestion) {
    const question = questionBySourceId.get(sourceQuestionId);
    if (!question) continue;
    await prisma.questMatchingPair.deleteMany({
      where: { questQuestionId: question.id },
    });
    await prisma.questMatchingPair.createMany({
      data: rows.map((r, i) => ({
        questQuestionId: question.id,
        leftId: r.left_id ?? String(i),
        leftLabel: r.left_label ?? "",
        rightId: r.right_id ?? String(i),
        rightLabel: r.right_label ?? "",
        pairOrder: int(r, "pair_order") ?? i + 1,
      })),
    });
    matchingCount += rows.length;
  }
  stats.QuestMatchingPair = matchingCount;

  const orderItemsByQuestion = byQuestion(
    orderRows as (Row & { question_id: string })[],
  );
  let orderItemCount = 0;
  for (const [sourceQuestionId, rows] of orderItemsByQuestion) {
    const question = questionBySourceId.get(sourceQuestionId);
    if (!question) continue;
    await prisma.questOrderItem.deleteMany({
      where: { questQuestionId: question.id },
    });
    await prisma.questOrderItem.createMany({
      data: rows.map((r, i) => ({
        questQuestionId: question.id,
        itemKind: r.item_kind ?? "ordering",
        itemId: r.item_id ?? String(i),
        label: orderItemLabel(
          sourceQuestionId,
          r,
          optionLabelByQuestionAndId,
          i,
        ),
        timeLabel: str(r, "time_label"),
        description: str(r, "description"),
        displayOrder: int(r, "display_order") ?? i + 1,
        correctPosition: int(r, "correct_position") ?? i + 1,
      })),
    });
    orderItemCount += rows.length;
  }
  stats.QuestOrderItem = orderItemCount;

  const acceptedByQuestion = byQuestion(
    acceptedRows as (Row & { question_id: string })[],
  );
  let acceptedCount = 0;
  for (const [sourceQuestionId, rows] of acceptedByQuestion) {
    const question = questionBySourceId.get(sourceQuestionId);
    if (!question) continue;
    await prisma.questAcceptedAnswer.deleteMany({
      where: { questQuestionId: question.id },
    });
    await prisma.questAcceptedAnswer.createMany({
      data: rows.map((r) => ({
        questQuestionId: question.id,
        answerText: r.accepted_answer ?? "",
        normalizedAnswer: str(r, "normalized_answer"),
        toleranceNumeric: num(r, "tolerance_numeric"),
        unit: str(r, "unit"),
        isPrimary: bool(r, "is_primary"),
      })),
    });
    acceptedCount += rows.length;
  }
  stats.QuestAcceptedAnswer = acceptedCount;

  const rubricByQuestion = byQuestion(
    rubricRows as (Row & { question_id: string })[],
  );
  let rubricCount = 0;
  for (const [sourceQuestionId, rows] of rubricByQuestion) {
    const question = questionBySourceId.get(sourceQuestionId);
    if (!question) continue;
    await prisma.questRubricCriterion.deleteMany({
      where: { questQuestionId: question.id },
    });
    await prisma.questRubricCriterion.createMany({
      data: rows.map((r) => ({
        questQuestionId: question.id,
        criterionId: r.criterion_id ?? "",
        criterion: r.criterion ?? "",
        criterionDescription: str(r, "criterion_description"),
        weightPct: num(r, "weight_pct") ?? 0,
        scoreDescriptions: {
          "1": str(r, "score_1_description") ?? "",
          "2": str(r, "score_2_description") ?? "",
          "3": str(r, "score_3_description") ?? "",
          "4": str(r, "score_4_description") ?? "",
        } satisfies Prisma.InputJsonValue,
      })),
    });
    rubricCount += rows.length;
  }
  stats.QuestRubricCriterion = rubricCount;

  const mediaByQuestion = byQuestion(
    mediaRows as (Row & { question_id: string })[],
  );
  let mediaCount = 0;
  for (const [sourceQuestionId, rows] of mediaByQuestion) {
    const question = questionBySourceId.get(sourceQuestionId);
    if (!question) continue;
    await prisma.questMedia.deleteMany({
      where: { questQuestionId: question.id },
    });
    await prisma.questMedia.createMany({
      data: rows.map((r) => ({
        questQuestionId: question.id,
        mediaType: r.media_type ?? "unknown",
        url: r.url ?? "",
        durationSeconds: int(r, "duration_seconds"),
        maxReplay: int(r, "max_replay"),
        transcriptAvailable: bool(r, "transcript_available"),
        transcript: str(r, "transcript"),
        altText: str(r, "alt_text"),
      })),
    });
    mediaCount += rows.length;
  }
  stats.QuestMedia = mediaCount;

  const hotspotByQuestion = byQuestion(
    hotspotRows as (Row & { question_id: string })[],
  );
  let hotspotCount = 0;
  for (const [sourceQuestionId, rows] of hotspotByQuestion) {
    const question = questionBySourceId.get(sourceQuestionId);
    if (!question) continue;
    await prisma.questHotspotArea.deleteMany({
      where: { questQuestionId: question.id },
    });
    await prisma.questHotspotArea.createMany({
      data: rows.map((r) => ({
        questQuestionId: question.id,
        hotspotId: r.hotspot_id ?? "",
        label: r.label ?? "",
        xRelative: num(r, "x_relative") ?? 0,
        yRelative: num(r, "y_relative") ?? 0,
        radiusRelative: num(r, "radius_relative") ?? 0.08,
        isCorrect: bool(r, "is_correct"),
        misconception: str(r, "misconception"),
      })),
    });
    hotspotCount += rows.length;
  }
  stats.QuestHotspotArea = hotspotCount;

  const evidenceByQuestion = byQuestion(
    evidenceRows as (Row & { question_id: string })[],
  );
  let evidenceCount = 0;
  for (const [sourceQuestionId, rows] of evidenceByQuestion) {
    const question = questionBySourceId.get(sourceQuestionId);
    if (!question) continue;
    await prisma.questEvidenceItem.deleteMany({
      where: { questQuestionId: question.id },
    });
    await prisma.questEvidenceItem.createMany({
      data: rows.map((r, i) => ({
        questQuestionId: question.id,
        evidenceId: r.evidence_id ?? String(i),
        label: r.label ?? "",
        description: str(r, "description"),
        category: str(r, "category"),
        isCorrectEvidence: bool(r, "is_correct_evidence"),
        misconception: str(r, "misconception"),
        displayOrder: int(r, "display_order") ?? i + 1,
      })),
    });
    evidenceCount += rows.length;
  }
  stats.QuestEvidenceItem = evidenceCount;

  // CODE_CONFIG: baris contoh dokumentasi (qc_note "Example", question_id
  // "KDX_Q0001") sengaja tidak match QuestQuestion manapun di QUESTION_BANK -
  // otomatis ter-skip di sini, cukup log-warn, jangan crash.
  let codeConfigCount = 0;
  for (const r of codeConfigRows) {
    const question = questionBySourceId.get(r.question_id ?? "");
    if (!question) {
      console.warn(
        `Skip CODE_CONFIG untuk question_id "${r.question_id}" (kemungkinan baris contoh dokumentasi, bukan konten sungguhan).`,
      );
      continue;
    }
    await prisma.questCodeConfig.upsert({
      where: { questQuestionId: question.id },
      create: {
        questQuestionId: question.id,
        language: r.language ?? "text",
        initialCode: str(r, "initial_code") ?? "",
        readOnlyPrefix: str(r, "read_only_prefix"),
        expectedOutput: str(r, "expected_output"),
        backendExecutionEnabled: bool(r, "backend_execution_enabled"),
        testCases: json(r, "test_cases_json"),
      },
      update: {
        language: r.language ?? "text",
        initialCode: str(r, "initial_code") ?? "",
        readOnlyPrefix: str(r, "read_only_prefix"),
        expectedOutput: str(r, "expected_output"),
        backendExecutionEnabled: bool(r, "backend_execution_enabled"),
        testCases: json(r, "test_cases_json"),
      },
    });
    codeConfigCount += 1;
  }
  stats.QuestCodeConfig = codeConfigCount;

  const MIN_ACTIVE_QUEST_QUESTIONS = 10;
  const activeQuests = await prisma.quest.findMany({
    where: { status: MissionStatus.ACTIVE },
    orderBy: { createdAt: "asc" },
    include: {
      _count: {
        select: { questions: { where: { status: QuestionStatus.ACTIVE } } },
      },
      chapter: {
        select: {
          id: true,
          title: true,
          goal: true,
          competencies: { select: { id: true, name: true, description: true } },
        },
      },
      subCompetency: {
        select: {
          id: true,
          name: true,
          description: true,
          competency: { select: { id: true, name: true, description: true } },
        },
      },
    },
  });

  let generatedTemplateQuestionCount = 0;
  let generatedTemplateOptionCount = 0;
  for (const quest of activeQuests) {
    const missing = Math.max(
      0,
      MIN_ACTIVE_QUEST_QUESTIONS - quest._count.questions,
    );
    if (missing === 0) continue;

    const competency =
      quest.subCompetency?.competency ?? quest.chapter?.competencies[0] ?? null;
    if (!competency) {
      console.warn(
        `Skip template question untuk quest ${quest.code}: tidak ada kompetensi.`,
      );
      continue;
    }

    for (let i = 1; i <= missing; i += 1) {
      const orderNumber = quest._count.questions + i;
      const code = `${quest.code}_TPL_Q${String(orderNumber).padStart(3, "0")}`;
      const focus = quest.subCompetency?.name ?? competency.name;
      const questionText =
        i % 3 === 1
          ? `Apa tujuan utama belajar "${focus}" dalam misi ini?`
          : i % 3 === 2
            ? `Sebelum menjawab soal tentang "${focus}", hal apa yang paling perlu diperhatikan?`
            : `Manakah pernyataan yang paling tepat tentang hubungan materi "${focus}" dengan misi "${quest.title}"?`;
      const correctLabel =
        i % 3 === 1
          ? (quest.objective ??
            competency.description ??
            `Memahami ${focus} dan menerapkannya pada masalah.`)
          : i % 3 === 2
            ? `Baca petunjuk, cocokkan bukti, lalu hubungkan dengan konsep ${focus}.`
            : `Materi membantu memilih jawaban berdasarkan alasan, bukan tebakan.`;
      const distractors = [
        `Langsung memilih jawaban tanpa membaca stimulus.`,
        `Menghafal istilah tanpa melihat konteks soal.`,
        `Mengabaikan instruksi karena semua pertanyaan pasti sama.`,
      ];

      const question = await prisma.questQuestion.upsert({
        where: { code },
        create: {
          questId: quest.id,
          code,
          questionType: QuestQuestionType.SINGLE_CHOICE,
          competencyId: competency.id,
          subCompetencyId: quest.subCompetencyId,
          measurementCategory: "Pemahaman Materi",
          difficulty: "Easy",
          bloomLevel: "Understand",
          orderNumber,
          questionText,
          stimulusText: quest.story ?? quest.chapter?.goal ?? undefined,
          instruction: "Pilih satu jawaban yang paling tepat.",
          skillTags: ["materi-template", slugify(focus)],
          masteryPoint: 1,
          xpReward: 1,
          estimatedTimeSeconds: 45,
          status: QuestionStatus.ACTIVE,
        },
        update: {
          questionType: QuestQuestionType.SINGLE_CHOICE,
          competencyId: competency.id,
          subCompetencyId: quest.subCompetencyId,
          measurementCategory: "Pemahaman Materi",
          difficulty: "Easy",
          bloomLevel: "Understand",
          orderNumber,
          questionText,
          stimulusText: quest.story ?? quest.chapter?.goal ?? undefined,
          instruction: "Pilih satu jawaban yang paling tepat.",
          skillTags: ["materi-template", slugify(focus)],
          masteryPoint: 1,
          xpReward: 1,
          estimatedTimeSeconds: 45,
          status: QuestionStatus.ACTIVE,
        },
      });

      await prisma.questQuestionOption.deleteMany({
        where: { questQuestionId: question.id },
      });
      await prisma.questQuestionOption.createMany({
        data: [
          {
            optionId: "A",
            label: correctLabel,
            isCorrect: true,
            displayOrder: 1,
          },
          {
            optionId: "B",
            label: distractors[0],
            isCorrect: false,
            displayOrder: 2,
          },
          {
            optionId: "C",
            label: distractors[1],
            isCorrect: false,
            displayOrder: 3,
          },
          {
            optionId: "D",
            label: distractors[2],
            isCorrect: false,
            displayOrder: 4,
          },
        ].map((option) => ({
          questQuestionId: question.id,
          ...option,
          misconception: option.isCorrect
            ? undefined
            : "Coba baca ulang materi dan instruksi misi.",
        })),
      });
      generatedTemplateQuestionCount += 1;
      generatedTemplateOptionCount += 4;
    }
  }
  stats.GeneratedQuestQuestionTemplate = generatedTemplateQuestionCount;
  stats.GeneratedQuestQuestionTemplateOption = generatedTemplateOptionCount;

  const placementQuestions = await prisma.questQuestion.findMany({
    where: { status: QuestionStatus.ACTIVE },
    orderBy: { orderNumber: "asc" },
    include: {
      quest: { select: { world: { select: { key: true } } } },
      options: { orderBy: { displayOrder: "asc" } },
      matchingPairs: { orderBy: { pairOrder: "asc" } },
      orderItems: { orderBy: { displayOrder: "asc" } },
      media: true,
      hotspotAreas: true,
      evidenceItems: { orderBy: { displayOrder: "asc" } },
      codeConfig: true,
    },
  });
  const seenQuestionTypes = new Set<string>();
  const placementQuestionsByType = new Map<
    QuestQuestionType,
    (typeof placementQuestions)[number]
  >();
  for (const question of placementQuestions) {
    if (!placementQuestionsByType.has(question.questionType)) {
      placementQuestionsByType.set(question.questionType, question);
    }
  }
  let placementTemplateCount = 0;
  const activePlacementCodes: string[] = [];
  for (const questionTypeValue of PLACEMENT_TYPE_ORDER) {
    const question = placementQuestionsByType.get(questionTypeValue);
    if (!question) continue;
    const questionType = question.questionType.toString();
    if (seenQuestionTypes.has(questionType)) continue;
    seenQuestionTypes.add(questionType);
    placementTemplateCount += 1;
    const code = `CURRICULUM_${question.code}`;
    activePlacementCodes.push(code);

    await prisma.placementQuestionTemplate.upsert({
      where: { code },
      create: {
        code,
        worldKey: question.quest.world.key,
        orderNumber: placementTemplateCount,
        questionType,
        prompt: question.questionText,
        payload: toPlacementPayload(question),
      },
      update: {
        worldKey: question.quest.world.key,
        orderNumber: placementTemplateCount,
        questionType,
        prompt: question.questionText,
        payload: toPlacementPayload(question),
        isActive: true,
      },
    });
  }
  await prisma.placementQuestionTemplate.updateMany({
    where: {
      isActive: true,
      code: { notIn: activePlacementCodes },
    },
    data: { isActive: false },
  });
  stats.PlacementQuestionTemplate = placementTemplateCount;

  console.log("Normalisasi kurikulum selesai:");
  console.table(stats);
}

type PlacementQuestionSource = Prisma.QuestQuestionGetPayload<{
  include: {
    options: true;
    matchingPairs: true;
    orderItems: true;
    media: true;
    hotspotAreas: true;
    evidenceItems: true;
    codeConfig: true;
  };
}>;

function toPlacementPayload(
  question: PlacementQuestionSource,
): Prisma.InputJsonValue {
  const media = question.media[0];
  return {
    id: question.code,
    questionType: question.questionType.toString(),
    prompt: question.questionText,
    instruction: question.instruction ?? question.stimulusText ?? undefined,
    options: question.options.map((option) => ({
      id: option.optionId,
      label: option.label,
      description: option.description ?? undefined,
      imageUrl: option.imageUrl ?? undefined,
    })),
    media: media
      ? {
          type: media.mediaType,
          url: media.url,
          durationSeconds: media.durationSeconds ?? undefined,
          maxReplay: media.maxReplay ?? undefined,
          transcriptAvailable: media.transcriptAvailable,
          transcript: media.transcript ?? undefined,
        }
      : undefined,
    responseConfig:
      question.inputMode ||
      question.maxLength ||
      question.caseSensitive !== null
        ? {
            inputMode: question.inputMode ?? "text",
            maxLength: question.maxLength ?? 200,
            caseSensitive: question.caseSensitive ?? false,
            allowEmpty: question.allowEmpty ?? false,
            allowUnit: question.allowUnit ?? false,
          }
        : undefined,
    matchingPairs: question.matchingPairs.map((pair) => ({
      leftId: pair.leftId,
      leftLabel: pair.leftLabel,
      rightId: pair.rightId,
      rightLabel: pair.rightLabel,
    })),
    orderingItems: question.orderItems.map((item) => ({
      id: item.itemId,
      label: item.label,
      timeLabel: item.timeLabel ?? undefined,
      description: item.description ?? undefined,
    })),
    timelineItems: question.orderItems.map((item) => ({
      id: item.itemId,
      label: item.label,
      timeLabel: item.timeLabel ?? undefined,
      description: item.description ?? undefined,
    })),
    hotspotAreas: question.hotspotAreas.map((area) => ({
      id: area.hotspotId,
      label: area.label,
      x: Number(area.xRelative),
      y: Number(area.yRelative),
      radius: Number(area.radiusRelative),
    })),
    evidenceItems: question.evidenceItems.map((item) => ({
      id: item.evidenceId,
      label: item.label,
      description: item.description ?? undefined,
      category: item.category ?? undefined,
    })),
    codeConfig: question.codeConfig
      ? {
          language: question.codeConfig.language,
          initialCode: question.codeConfig.initialCode,
          backendExecutionEnabled: question.codeConfig.backendExecutionEnabled,
        }
      : undefined,
  } as Prisma.InputJsonValue;
}

main()
  .catch((error) => {
    console.error("Normalisasi kurikulum gagal:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
