import { MissionStatus, Prisma, PrismaClient, QuestQuestionType, QuestionStatus } from '@prisma/client';

const prisma = new PrismaClient();

type Row = Record<string, string>;

function str(row: Row, key: string): string | undefined {
  const v = row[key];
  return v === undefined || v === '' ? undefined : v;
}

function num(row: Row, key: string): number | undefined {
  const v = row[key];
  if (v === undefined || v === '') return undefined;
  const cleaned = v.replace('%', '').trim();
  const n = Number(cleaned);
  return Number.isNaN(n) ? undefined : n;
}

function int(row: Row, key: string): number | undefined {
  const n = num(row, key);
  return n === undefined ? undefined : Math.round(n);
}

function bool(row: Row, key: string): boolean {
  const v = row[key];
  return v === 'Yes' || v === 'yes' || v === 'true' || v === 'TRUE';
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

function json(row: Row, key: string): Prisma.InputJsonValue | undefined {
  const v = row[key];
  if (!v) return undefined;
  try {
    return JSON.parse(v) as Prisma.InputJsonValue;
  } catch {
    return undefined;
  }
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
  const snake = value.replace(/([A-Z])/g, '_$1').toUpperCase();
  return Object.values(QuestQuestionType).includes(snake as QuestQuestionType)
    ? (snake as QuestQuestionType)
    : undefined;
}

async function loadSheet(sheetName: string): Promise<Row[]> {
  const records = await prisma.curriculumSourceRecord.findMany({
    where: { sheetName },
    orderBy: { rowNumber: 'asc' },
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
    loadSheet('WORLD_MASTER'),
    loadSheet('SUB_WORLD'),
    loadSheet('CHAPTER_MASTER'),
    loadSheet('COMPETENCY_MASTER'),
    loadSheet('SUBCOMPETENCY'),
    loadSheet('DAILY_MISSION_TEMPLATE'),
    loadSheet('QUESTION_BANK'),
    loadSheet('QUESTION_TYPE_CONFIG'),
    loadSheet('QUESTION_OPTIONS'),
    loadSheet('MATCHING_PAIRS'),
    loadSheet('ORDER_TIMELINE_ITEMS'),
    loadSheet('ACCEPTED_ANSWERS'),
    loadSheet('RUBRIC_CRITERIA'),
    loadSheet('QUESTION_MEDIA'),
    loadSheet('HOTSPOT_AREAS'),
    loadSheet('EVIDENCE_ITEMS'),
    loadSheet('CODE_CONFIG'),
  ]);

  const stats: Record<string, number> = {};

  // 1. Subject + World -----------------------------------------------------
  const worldBySourceId = new Map<string, { id: string; key: string }>();
  for (const w of worldRows) {
    if (!w.world_id) continue;
    const subject = await prisma.subject.upsert({
      where: { code: w.world_id },
      create: { code: w.world_id, name: w.world_name ?? w.world_id, description: str(w, 'description') },
      update: { name: w.world_name ?? w.world_id, description: str(w, 'description') },
    });
    const key = (w.world_name ?? w.world_id).toLowerCase();
    const world = await prisma.world.upsert({
      where: { key },
      create: {
        key,
        subjectId: subject.id,
        name: w.world_name ?? w.world_id,
        characterClass: str(w, 'subject') ?? 'Explorer',
        themeDescription: str(w, 'lore'),
        isActive: true,
      },
      update: {
        name: w.world_name ?? w.world_id,
        themeDescription: str(w, 'lore'),
      },
    });
    worldBySourceId.set(w.world_id, world);
  }
  stats.World = worldBySourceId.size;

  const subWorldBySourceId = new Map(subWorldRows.map((r) => [r.sub_world_id, r]));

  // 2. Chapter ---------------------------------------------------------------
  const chapterBySourceId = new Map<string, { id: string }>();
  for (const c of chapterRows) {
    if (!c.chapter_id) continue;
    const subWorld = subWorldBySourceId.get(c.sub_world_id ?? '');
    const world = subWorld ? worldBySourceId.get(subWorld.world_id) : undefined;
    if (!world) {
      console.warn(`Skip chapter ${c.chapter_id}: World untuk sub_world_id "${c.sub_world_id}" tidak ketemu.`);
      continue;
    }
    const chapter = await prisma.chapter.upsert({
      where: { chapterCode: c.chapter_id },
      create: {
        chapterCode: c.chapter_id,
        worldId: world.id,
        subWorldKey: subWorld?.sub_world_id,
        subWorldName: subWorld?.name,
        chapterNumber: int(c, 'chapter_number') ?? 1,
        title: c.chapter_title ?? c.chapter_id,
        story: str(c, 'chapter_story'),
        difficulty: str(c, 'difficulty'),
        estimatedDurationDays: int(c, 'estimated_duration_days'),
        recommendedSessions: int(c, 'recommended_sessions'),
        goal: str(c, 'chapter_goal'),
        completionIndicator: str(c, 'completion_indicator'),
        bossMissionUnlockMasteryPct: num(c, 'boss_mission_unlock_mastery'),
        status: MissionStatus.ACTIVE,
      },
      update: {
        title: c.chapter_title ?? c.chapter_id,
        story: str(c, 'chapter_story'),
        difficulty: str(c, 'difficulty'),
        estimatedDurationDays: int(c, 'estimated_duration_days'),
        recommendedSessions: int(c, 'recommended_sessions'),
        goal: str(c, 'chapter_goal'),
        completionIndicator: str(c, 'completion_indicator'),
        bossMissionUnlockMasteryPct: num(c, 'boss_mission_unlock_mastery'),
        status: MissionStatus.ACTIVE,
      },
    });
    chapterBySourceId.set(c.chapter_id, chapter);
  }
  stats.Chapter = chapterBySourceId.size;

  // 3. Competency + SubCompetency --------------------------------------------
  const competencyBySourceId = new Map<string, { id: string; subjectId: string }>();
  let competencyOrder = 0;
  for (const comp of competencyRows) {
    if (!comp.competency_id) continue;
    const chapter = chapterBySourceId.get(comp.chapter_id ?? '');
    if (!chapter) {
      console.warn(`Skip competency ${comp.competency_id}: Chapter "${comp.chapter_id}" tidak ketemu.`);
      continue;
    }
    const chapterFull = await prisma.chapter.findUniqueOrThrow({ where: { id: chapter.id }, select: { worldId: true } });
    const world = await prisma.world.findUniqueOrThrow({ where: { id: chapterFull.worldId }, select: { subjectId: true } });
    competencyOrder += 1;
    const competency = await prisma.competency.upsert({
      where: { subjectId_code: { subjectId: world.subjectId, code: comp.competency_id } },
      create: {
        subjectId: world.subjectId,
        chapterId: chapter.id,
        code: comp.competency_id,
        name: comp.competency_name ?? comp.competency_id,
        description: str(comp, 'description'),
        orderNumber: int(comp, 'sequence_number') ?? competencyOrder,
      },
      update: {
        chapterId: chapter.id,
        name: comp.competency_name ?? comp.competency_id,
        description: str(comp, 'description'),
      },
    });
    competencyBySourceId.set(comp.competency_id, competency);
  }
  stats.Competency = competencyBySourceId.size;

  const subCompetencyBySourceId = new Map<string, { id: string }>();
  let subCompetencyOrder = 0;
  for (const sub of subCompetencyRows) {
    if (!sub.subcompetency_id) continue;
    const competency = competencyBySourceId.get(sub.competency_id ?? '');
    if (!competency) {
      console.warn(`Skip subcompetency ${sub.subcompetency_id}: Competency "${sub.competency_id}" tidak ketemu.`);
      continue;
    }
    subCompetencyOrder += 1;
    const subCompetency = await prisma.subCompetency.upsert({
      where: { competencyId_code: { competencyId: competency.id, code: sub.subcompetency_id } },
      create: {
        competencyId: competency.id,
        code: sub.subcompetency_id,
        name: sub.name ?? sub.subcompetency_id,
        description: str(sub, 'learning_objective'),
        orderNumber: int(sub, 'sequence_number') ?? subCompetencyOrder,
      },
      update: {
        name: sub.name ?? sub.subcompetency_id,
        description: str(sub, 'learning_objective'),
      },
    });
    subCompetencyBySourceId.set(sub.subcompetency_id, subCompetency);
  }
  stats.SubCompetency = subCompetencyBySourceId.size;

  // 4. Quest (Daily Mission Template) ----------------------------------------
  const questBySourceId = new Map<string, { id: string }>();
  for (const m of missionRows) {
    if (!m.mission_id) continue;
    const chapter = chapterBySourceId.get(m.chapter_id ?? '');
    if (!chapter) {
      console.warn(`Skip quest ${m.mission_id}: Chapter "${m.chapter_id}" tidak ketemu.`);
      continue;
    }
    const chapterFull = await prisma.chapter.findUniqueOrThrow({ where: { id: chapter.id }, select: { worldId: true } });
    const subCompetency = subCompetencyBySourceId.get(m.subcompetency_id ?? '');
    const hints = [str(m, 'hint_1'), str(m, 'hint_2'), str(m, 'hint_3')].filter((h): h is string => Boolean(h));
    const quest = await prisma.quest.upsert({
      where: { code: m.mission_id },
      create: {
        code: m.mission_id,
        worldId: chapterFull.worldId,
        chapterId: chapter.id,
        subCompetencyId: subCompetency?.id,
        title: m.mission_title ?? m.mission_id,
        missionType: str(m, 'mission_type'),
        story: str(m, 'mission_story'),
        objective: str(m, 'objective'),
        studentInstruction: str(m, 'student_instruction'),
        estimatedMinutes: int(m, 'duration_minutes') ?? 10,
        xpRewardFirst: int(m, 'xp_reward_first') ?? 0,
        xpMultiplierSecond: num(m, 'xp_multiplier_second'),
        xpMultiplierThirdPlus: num(m, 'xp_multiplier_third_plus'),
        hints,
        status: MissionStatus.ACTIVE,
      },
      update: {
        title: m.mission_title ?? m.mission_id,
        story: str(m, 'mission_story'),
        objective: str(m, 'objective'),
        studentInstruction: str(m, 'student_instruction'),
        estimatedMinutes: int(m, 'duration_minutes') ?? 10,
        xpRewardFirst: int(m, 'xp_reward_first') ?? 0,
        xpMultiplierSecond: num(m, 'xp_multiplier_second'),
        xpMultiplierThirdPlus: num(m, 'xp_multiplier_third_plus'),
        hints,
        status: MissionStatus.ACTIVE,
      },
    });
    questBySourceId.set(m.mission_id, quest);
  }
  stats.Quest = questBySourceId.size;

  // 5. QuestQuestion (skip baris yang cuma dipakai assessment_id / Cek Paham -
  //    di luar scope, lihat plan implementasi) ------------------------------
  const typeConfigByQuestionId = new Map(typeConfigRows.map((r) => [r.question_id, r]));
  const questionBySourceId = new Map<string, { id: string }>();
  const orderCounter = new Map<string, number>();
  let skippedAssessmentOnly = 0;
  for (const q of questionRows) {
    if (!q.question_id) continue;
    const quest = questBySourceId.get(q.mission_id ?? '');
    if (!quest) {
      skippedAssessmentOnly += 1;
      continue;
    }
    const competency = competencyBySourceId.get(q.competency_id ?? '');
    if (!competency) {
      console.warn(`Skip question ${q.question_id}: Competency "${q.competency_id}" tidak ketemu.`);
      continue;
    }
    const questionType = toQuestionType(q.question_type ?? '');
    if (!questionType) {
      console.warn(`Skip question ${q.question_id}: question_type "${q.question_type}" tidak dikenal.`);
      continue;
    }
    const subCompetency = subCompetencyBySourceId.get(q.subcompetency_id ?? '');
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
        measurementCategory: str(q, 'measurement_category'),
        difficulty: str(q, 'difficulty'),
        bloomLevel: str(q, 'bloom_level'),
        orderNumber: order,
        questionText: q.question_text ?? '',
        stimulusText: str(q, 'stimulus_text'),
        instruction: str(q, 'instruction'),
        skillTags: csv(q, 'skill_tags'),
        masteryPoint: int(q, 'mastery_point'),
        xpReward: int(q, 'xp_reward'),
        estimatedTimeSeconds: int(q, 'estimated_time_seconds'),
        inputMode: str(typeConfig, 'input_mode'),
        maxLength: int(typeConfig, 'max_length'),
        caseSensitive: optBool(typeConfig, 'case_sensitive'),
        allowEmpty: optBool(typeConfig, 'allow_empty'),
        allowUnit: optBool(typeConfig, 'allow_unit'),
        scoringConfig: str(typeConfig, 'scoring_config'),
        sampleAnswer: str(typeConfig, 'sample_answer'),
        status: QuestionStatus.ACTIVE,
      },
      update: {
        questionType,
        measurementCategory: str(q, 'measurement_category'),
        difficulty: str(q, 'difficulty'),
        bloomLevel: str(q, 'bloom_level'),
        questionText: q.question_text ?? '',
        stimulusText: str(q, 'stimulus_text'),
        instruction: str(q, 'instruction'),
        skillTags: csv(q, 'skill_tags'),
        masteryPoint: int(q, 'mastery_point'),
        xpReward: int(q, 'xp_reward'),
        estimatedTimeSeconds: int(q, 'estimated_time_seconds'),
        inputMode: str(typeConfig, 'input_mode'),
        maxLength: int(typeConfig, 'max_length'),
        caseSensitive: optBool(typeConfig, 'case_sensitive'),
        allowEmpty: optBool(typeConfig, 'allow_empty'),
        allowUnit: optBool(typeConfig, 'allow_unit'),
        scoringConfig: str(typeConfig, 'scoring_config'),
        sampleAnswer: str(typeConfig, 'sample_answer'),
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

  const optionsByQuestion = byQuestion(optionRows as (Row & { question_id: string })[]);
  let optionCount = 0;
  for (const [sourceQuestionId, rows] of optionsByQuestion) {
    const question = questionBySourceId.get(sourceQuestionId);
    if (!question) continue;
    await prisma.questQuestionOption.deleteMany({ where: { questQuestionId: question.id } });
    await prisma.questQuestionOption.createMany({
      data: rows.map((r, i) => ({
        questQuestionId: question.id,
        optionId: r.option_id ?? String(i),
        label: r.label ?? '',
        description: str(r, 'description'),
        imageUrl: str(r, 'image_url'),
        isCorrect: bool(r, 'is_correct'),
        misconception: str(r, 'misconception'),
        displayOrder: int(r, 'display_order') ?? i + 1,
      })),
    });
    optionCount += rows.length;
  }
  stats.QuestQuestionOption = optionCount;

  const matchingByQuestion = byQuestion(matchingRows as (Row & { question_id: string })[]);
  let matchingCount = 0;
  for (const [sourceQuestionId, rows] of matchingByQuestion) {
    const question = questionBySourceId.get(sourceQuestionId);
    if (!question) continue;
    await prisma.questMatchingPair.deleteMany({ where: { questQuestionId: question.id } });
    await prisma.questMatchingPair.createMany({
      data: rows.map((r, i) => ({
        questQuestionId: question.id,
        leftId: r.left_id ?? String(i),
        leftLabel: r.left_label ?? '',
        rightId: r.right_id ?? String(i),
        rightLabel: r.right_label ?? '',
        pairOrder: int(r, 'pair_order') ?? i + 1,
      })),
    });
    matchingCount += rows.length;
  }
  stats.QuestMatchingPair = matchingCount;

  const orderItemsByQuestion = byQuestion(orderRows as (Row & { question_id: string })[]);
  let orderItemCount = 0;
  for (const [sourceQuestionId, rows] of orderItemsByQuestion) {
    const question = questionBySourceId.get(sourceQuestionId);
    if (!question) continue;
    await prisma.questOrderItem.deleteMany({ where: { questQuestionId: question.id } });
    await prisma.questOrderItem.createMany({
      data: rows.map((r, i) => ({
        questQuestionId: question.id,
        itemKind: r.item_kind ?? 'ordering',
        itemId: r.item_id ?? String(i),
        label: r.label ?? '',
        timeLabel: str(r, 'time_label'),
        description: str(r, 'description'),
        displayOrder: int(r, 'display_order') ?? i + 1,
        correctPosition: int(r, 'correct_position') ?? i + 1,
      })),
    });
    orderItemCount += rows.length;
  }
  stats.QuestOrderItem = orderItemCount;

  const acceptedByQuestion = byQuestion(acceptedRows as (Row & { question_id: string })[]);
  let acceptedCount = 0;
  for (const [sourceQuestionId, rows] of acceptedByQuestion) {
    const question = questionBySourceId.get(sourceQuestionId);
    if (!question) continue;
    await prisma.questAcceptedAnswer.deleteMany({ where: { questQuestionId: question.id } });
    await prisma.questAcceptedAnswer.createMany({
      data: rows.map((r) => ({
        questQuestionId: question.id,
        answerText: r.accepted_answer ?? '',
        normalizedAnswer: str(r, 'normalized_answer'),
        toleranceNumeric: num(r, 'tolerance_numeric'),
        unit: str(r, 'unit'),
        isPrimary: bool(r, 'is_primary'),
      })),
    });
    acceptedCount += rows.length;
  }
  stats.QuestAcceptedAnswer = acceptedCount;

  const rubricByQuestion = byQuestion(rubricRows as (Row & { question_id: string })[]);
  let rubricCount = 0;
  for (const [sourceQuestionId, rows] of rubricByQuestion) {
    const question = questionBySourceId.get(sourceQuestionId);
    if (!question) continue;
    await prisma.questRubricCriterion.deleteMany({ where: { questQuestionId: question.id } });
    await prisma.questRubricCriterion.createMany({
      data: rows.map((r) => ({
        questQuestionId: question.id,
        criterionId: r.criterion_id ?? '',
        criterion: r.criterion ?? '',
        criterionDescription: str(r, 'criterion_description'),
        weightPct: num(r, 'weight_pct') ?? 0,
        scoreDescriptions: {
          '1': str(r, 'score_1_description') ?? '',
          '2': str(r, 'score_2_description') ?? '',
          '3': str(r, 'score_3_description') ?? '',
          '4': str(r, 'score_4_description') ?? '',
        } satisfies Prisma.InputJsonValue,
      })),
    });
    rubricCount += rows.length;
  }
  stats.QuestRubricCriterion = rubricCount;

  const mediaByQuestion = byQuestion(mediaRows as (Row & { question_id: string })[]);
  let mediaCount = 0;
  for (const [sourceQuestionId, rows] of mediaByQuestion) {
    const question = questionBySourceId.get(sourceQuestionId);
    if (!question) continue;
    await prisma.questMedia.deleteMany({ where: { questQuestionId: question.id } });
    await prisma.questMedia.createMany({
      data: rows.map((r) => ({
        questQuestionId: question.id,
        mediaType: r.media_type ?? 'unknown',
        url: r.url ?? '',
        durationSeconds: int(r, 'duration_seconds'),
        maxReplay: int(r, 'max_replay'),
        transcriptAvailable: bool(r, 'transcript_available'),
        transcript: str(r, 'transcript'),
        altText: str(r, 'alt_text'),
      })),
    });
    mediaCount += rows.length;
  }
  stats.QuestMedia = mediaCount;

  const hotspotByQuestion = byQuestion(hotspotRows as (Row & { question_id: string })[]);
  let hotspotCount = 0;
  for (const [sourceQuestionId, rows] of hotspotByQuestion) {
    const question = questionBySourceId.get(sourceQuestionId);
    if (!question) continue;
    await prisma.questHotspotArea.deleteMany({ where: { questQuestionId: question.id } });
    await prisma.questHotspotArea.createMany({
      data: rows.map((r) => ({
        questQuestionId: question.id,
        hotspotId: r.hotspot_id ?? '',
        label: r.label ?? '',
        xRelative: num(r, 'x_relative') ?? 0,
        yRelative: num(r, 'y_relative') ?? 0,
        radiusRelative: num(r, 'radius_relative') ?? 0.08,
        isCorrect: bool(r, 'is_correct'),
        misconception: str(r, 'misconception'),
      })),
    });
    hotspotCount += rows.length;
  }
  stats.QuestHotspotArea = hotspotCount;

  const evidenceByQuestion = byQuestion(evidenceRows as (Row & { question_id: string })[]);
  let evidenceCount = 0;
  for (const [sourceQuestionId, rows] of evidenceByQuestion) {
    const question = questionBySourceId.get(sourceQuestionId);
    if (!question) continue;
    await prisma.questEvidenceItem.deleteMany({ where: { questQuestionId: question.id } });
    await prisma.questEvidenceItem.createMany({
      data: rows.map((r, i) => ({
        questQuestionId: question.id,
        evidenceId: r.evidence_id ?? String(i),
        label: r.label ?? '',
        description: str(r, 'description'),
        category: str(r, 'category'),
        isCorrectEvidence: bool(r, 'is_correct_evidence'),
        misconception: str(r, 'misconception'),
        displayOrder: int(r, 'display_order') ?? i + 1,
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
    const question = questionBySourceId.get(r.question_id ?? '');
    if (!question) {
      console.warn(`Skip CODE_CONFIG untuk question_id "${r.question_id}" (kemungkinan baris contoh dokumentasi, bukan konten sungguhan).`);
      continue;
    }
    await prisma.questCodeConfig.upsert({
      where: { questQuestionId: question.id },
      create: {
        questQuestionId: question.id,
        language: r.language ?? 'text',
        initialCode: str(r, 'initial_code') ?? '',
        readOnlyPrefix: str(r, 'read_only_prefix'),
        expectedOutput: str(r, 'expected_output'),
        backendExecutionEnabled: bool(r, 'backend_execution_enabled'),
        testCases: json(r, 'test_cases_json'),
      },
      update: {
        language: r.language ?? 'text',
        initialCode: str(r, 'initial_code') ?? '',
        readOnlyPrefix: str(r, 'read_only_prefix'),
        expectedOutput: str(r, 'expected_output'),
        backendExecutionEnabled: bool(r, 'backend_execution_enabled'),
        testCases: json(r, 'test_cases_json'),
      },
    });
    codeConfigCount += 1;
  }
  stats.QuestCodeConfig = codeConfigCount;

  const placementQuestions = await prisma.questQuestion.findMany({
    where: { code: { in: [...questionBySourceId.keys()] }, status: QuestionStatus.ACTIVE },
    orderBy: { orderNumber: 'asc' },
    include: {
      options: { orderBy: { displayOrder: 'asc' } },
      matchingPairs: { orderBy: { pairOrder: 'asc' } },
      orderItems: { orderBy: { displayOrder: 'asc' } },
      media: true,
      hotspotAreas: true,
      evidenceItems: { orderBy: { displayOrder: 'asc' } },
      codeConfig: true,
    },
  });
  const seenQuestionTypes = new Set<string>();
  const placementQuestionsByType = new Map(
    placementQuestions.map((question) => [question.questionType, question]),
  );
  let placementTemplateCount = 0;
  for (const questionTypeValue of PLACEMENT_TYPE_ORDER) {
    const question = placementQuestionsByType.get(questionTypeValue);
    if (!question) continue;
    const questionType = question.questionType.toString();
    if (seenQuestionTypes.has(questionType)) continue;
    seenQuestionTypes.add(questionType);
    placementTemplateCount += 1;

    await prisma.placementQuestionTemplate.upsert({
      where: { code: `CURRICULUM_${question.code}` },
      create: {
        code: `CURRICULUM_${question.code}`,
        worldKey: 'scientia',
        orderNumber: placementTemplateCount,
        questionType,
        prompt: question.questionText,
        payload: toPlacementPayload(question),
      },
      update: {
        worldKey: 'scientia',
        orderNumber: placementTemplateCount,
        questionType,
        prompt: question.questionText,
        payload: toPlacementPayload(question),
        isActive: true,
      },
    });
  }
  stats.PlacementQuestionTemplate = placementTemplateCount;

  console.log('Normalisasi kurikulum selesai:');
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

function toPlacementPayload(question: PlacementQuestionSource): Prisma.InputJsonValue {
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
      question.inputMode || question.maxLength || question.caseSensitive !== null
        ? {
            inputMode: question.inputMode ?? 'text',
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
    console.error('Normalisasi kurikulum gagal:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
