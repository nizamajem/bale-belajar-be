import { BadRequestException, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { execFile } from "child_process";
import { promisify } from "util";
import { PrismaService } from "../../database/prisma/prisma.service";

const execFileAsync = promisify(execFile);

type SheetRow = {
  _rowNumber?: number;
  [key: string]: unknown;
};

type SheetData = {
  headerRowNumber?: number;
  headers?: string[];
  rows?: SheetRow[];
};

type CurriculumExport = {
  workbook?: string;
  sourcePath?: string;
  sheets?: Record<string, SheetData>;
};

@Injectable()
export class CurriculumImportService {
  constructor(private readonly prisma: PrismaService) {}

  template() {
    return curriculumTemplate;
  }

  async importJson(input: { curriculum?: unknown; normalize?: boolean }) {
    const curriculum = input.curriculum as CurriculumExport | undefined;
    if (!curriculum || !curriculum.sheets || typeof curriculum.sheets !== "object") {
      throw new BadRequestException("File template tidak valid. Upload JSON dari template kurikulum.");
    }

    const workbook = curriculum.workbook?.trim() || `admin-import-${Date.now()}.json`;
    let imported = 0;
    let sheetsWithData = 0;

    for (const [sheetName, sheet] of Object.entries(curriculum.sheets)) {
      const rows = sheet.rows ?? [];
      if (!Array.isArray(rows) || rows.length === 0) continue;
      sheetsWithData += 1;
      const idHeader = sheet.headers?.[0];

      for (const [index, row] of rows.entries()) {
        const { _rowNumber, ...fields } = row;
        const rowNumber = Number(_rowNumber ?? index + 2);
        const sourceId = idHeader ? String(fields[idHeader] ?? "") || null : null;

        await this.prisma.curriculumSourceRecord.upsert({
          where: {
            workbook_sheetName_rowNumber: {
              workbook,
              sheetName,
              rowNumber,
            },
          },
          create: {
            workbook,
            sheetName,
            rowNumber,
            sourceId,
            payload: fields as Prisma.InputJsonValue,
          },
          update: {
            sourceId,
            payload: fields as Prisma.InputJsonValue,
          },
        });
        imported += 1;
      }
    }

    let normalizeOutput: string | undefined;
    if (input.normalize ?? true) {
      normalizeOutput = await this.normalizeCurriculum();
    }

    return {
      workbook,
      importedRows: imported,
      sheetsWithData,
      normalized: input.normalize ?? true,
      normalizeOutput,
    };
  }

  private async normalizeCurriculum() {
    try {
      const { stdout, stderr } = await execFileAsync(
        process.execPath,
        ["prisma/normalize-curriculum-runner.js"],
        {
          cwd: process.cwd(),
          timeout: 120_000,
          windowsHide: true,
        },
      );
      return [stdout.trim(), stderr.trim()].filter(Boolean).join("\n");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Normalisasi kurikulum gagal.";
      throw new BadRequestException(message);
    }
  }
}

const requiredSheets = [
  "WORLD_MASTER",
  "SUB_WORLD",
  "CHAPTER_MASTER",
  "COMPETENCY_MASTER",
  "SUBCOMPETENCY",
  "DAILY_MISSION_TEMPLATE",
  "QUESTION_BANK",
  "QUESTION_TYPE_CONFIG",
  "QUESTION_OPTIONS",
  "MATCHING_PAIRS",
  "ORDER_TIMELINE_ITEMS",
  "ACCEPTED_ANSWERS",
  "RUBRIC_CRITERIA",
  "QUESTION_MEDIA",
  "HOTSPOT_AREAS",
  "EVIDENCE_ITEMS",
  "CODE_CONFIG",
] as const;

const curriculumTemplate: CurriculumExport = {
  workbook: "Template_Kurikulum_BaleVerse_Admin.json",
  sourcePath: "admin-upload",
  sheets: Object.fromEntries(
    requiredSheets.map((sheetName) => [
      sheetName,
      {
        headerRowNumber: 1,
        headers: headersFor(sheetName),
        rows: sampleRowsFor(sheetName),
      },
    ]),
  ),
};

function headersFor(sheetName: string) {
  return sampleRowsFor(sheetName)[0]
    ? Object.keys(sampleRowsFor(sheetName)[0]).filter((key) => key !== "_rowNumber")
    : [];
}

function sampleRowsFor(sheetName: string): SheetRow[] {
  const rows: Record<string, SheetRow[]> = {
    WORLD_MASTER: [
      {
        _rowNumber: 2,
        world_id: "SCI",
        world_name: "Scientia",
        subject: "Sains",
        description: "Dunia sains untuk observasi, eksperimen, dan penalaran.",
        lore: "Belajar sains lewat kasus dan misi harian.",
      },
    ],
    SUB_WORLD: [
      {
        _rowNumber: 2,
        sub_world_id: "SCI_BIO",
        world_id: "SCI",
        name: "Biologi Dasar",
      },
    ],
    CHAPTER_MASTER: [
      {
        _rowNumber: 2,
        chapter_id: "SCI_CH01",
        sub_world_id: "SCI_BIO",
        chapter_number: "1",
        chapter_title: "Sel dan Organisasi Kehidupan",
        chapter_story: "Menyelidiki tanda kehidupan dari bukti sederhana.",
        difficulty: "Easy",
      },
    ],
    COMPETENCY_MASTER: [
      {
        _rowNumber: 2,
        competency_id: "SCI_COMP01",
        chapter_id: "SCI_CH01",
        competency_name: "Mengidentifikasi ciri makhluk hidup",
        description: "Siswa memahami ciri dasar makhluk hidup.",
        sequence_number: "1",
      },
    ],
    SUBCOMPETENCY: [
      {
        _rowNumber: 2,
        subcompetency_id: "SCI_SUB01",
        competency_id: "SCI_COMP01",
        name: "Mengamati ciri kehidupan",
        learning_objective: "Membedakan benda hidup dan tak hidup dari ciri yang terlihat.",
        sequence_number: "1",
      },
    ],
    DAILY_MISSION_TEMPLATE: [
      {
        _rowNumber: 2,
        mission_id: "SCI_M001",
        chapter_id: "SCI_CH01",
        subcompetency_id: "SCI_SUB01",
        mission_title: "Misi Bukti Kehidupan",
        mission_type: "Daily",
        mission_story: "Pilih bukti paling kuat dari sebuah pengamatan.",
        objective: "Menggunakan bukti untuk mengklasifikasi makhluk hidup.",
        student_instruction: "Baca kasus, lalu jawab pertanyaan.",
        duration_minutes: "10",
        xp_reward_first: "50",
      },
    ],
    QUESTION_BANK: [
      {
        _rowNumber: 2,
        question_id: "SCI_Q001",
        mission_id: "SCI_M001",
        competency_id: "SCI_COMP01",
        subcompetency_id: "SCI_SUB01",
        question_type: "singleChoice",
        question_text: "Bukti mana yang paling menunjukkan bahwa objek adalah makhluk hidup?",
        instruction: "Pilih satu jawaban.",
        correct_answer: "A",
        scoring_rule: "Satu opsi benar. Isi semua pilihan di sheet QUESTION_OPTIONS dan tandai is_correct=Yes pada kunci.",
        difficulty: "Easy",
        bloom_level: "Understand",
        measurement_category: "Konsep",
        skill_tags: "observasi,klasifikasi",
        mastery_point: "10",
        xp_reward: "10",
        estimated_time_seconds: "60",
      },
      {
        _rowNumber: 3,
        question_id: "SCI_Q002",
        mission_id: "SCI_M001",
        competency_id: "SCI_COMP01",
        subcompetency_id: "SCI_SUB01",
        question_type: "multipleSelect",
        question_text: "Pilih semua ciri makhluk hidup.",
        instruction: "Boleh pilih lebih dari satu.",
        correct_answer: "A;C",
        scoring_rule: "Lebih dari satu opsi benar. Tandai semua kunci di QUESTION_OPTIONS.",
        difficulty: "Easy",
        bloom_level: "Remember",
        measurement_category: "Konsep",
        skill_tags: "ciri makhluk hidup",
        mastery_point: "10",
        xp_reward: "10",
        estimated_time_seconds: "75",
      },
      {
        _rowNumber: 4,
        question_id: "SCI_Q003",
        mission_id: "SCI_M001",
        competency_id: "SCI_COMP01",
        subcompetency_id: "SCI_SUB01",
        question_type: "binaryChoice",
        question_text: "Semua benda yang bergerak sendiri pasti makhluk hidup.",
        instruction: "Pilih benar atau salah.",
        correct_answer: "B",
        scoring_rule: "Gunakan dua opsi di QUESTION_OPTIONS: A=Benar, B=Salah.",
        difficulty: "Easy",
        bloom_level: "Understand",
        measurement_category: "Miskonsepsi",
        skill_tags: "penalaran",
        mastery_point: "10",
        xp_reward: "10",
        estimated_time_seconds: "45",
      },
      {
        _rowNumber: 5,
        question_id: "SCI_Q004",
        mission_id: "SCI_M001",
        competency_id: "SCI_COMP01",
        subcompetency_id: "SCI_SUB01",
        question_type: "shortText",
        question_text: "Sebutkan satu ciri utama makhluk hidup.",
        instruction: "Jawab singkat.",
        correct_answer: "bernapas / tumbuh / berkembang biak",
        scoring_rule: "Isi daftar jawaban diterima di ACCEPTED_ANSWERS.",
        difficulty: "Easy",
        bloom_level: "Remember",
        measurement_category: "Konsep",
        skill_tags: "ciri makhluk hidup",
        mastery_point: "10",
        xp_reward: "10",
        estimated_time_seconds: "60",
      },
      {
        _rowNumber: 6,
        question_id: "SCI_Q005",
        mission_id: "SCI_M001",
        competency_id: "SCI_COMP01",
        subcompetency_id: "SCI_SUB01",
        question_type: "matching",
        question_text: "Jodohkan ciri makhluk hidup dengan contohnya.",
        instruction: "Pasangkan kiri dan kanan.",
        correct_answer: "Lihat MATCHING_PAIRS",
        scoring_rule: "Setiap baris MATCHING_PAIRS adalah satu pasangan benar.",
        difficulty: "Medium",
        bloom_level: "Apply",
        measurement_category: "Konsep",
        skill_tags: "pencocokan",
        mastery_point: "10",
        xp_reward: "15",
        estimated_time_seconds: "90",
      },
      {
        _rowNumber: 7,
        question_id: "SCI_Q006",
        mission_id: "SCI_M001",
        competency_id: "SCI_COMP01",
        subcompetency_id: "SCI_SUB01",
        question_type: "ordering",
        question_text: "Urutkan langkah pengamatan tanaman kacang hijau.",
        instruction: "Susun dari awal sampai akhir.",
        correct_answer: "Lihat ORDER_TIMELINE_ITEMS",
        scoring_rule: "correct_position adalah posisi jawaban benar.",
        difficulty: "Medium",
        bloom_level: "Apply",
        measurement_category: "Prosedur",
        skill_tags: "urutan,observasi",
        mastery_point: "10",
        xp_reward: "15",
        estimated_time_seconds: "90",
      },
      {
        _rowNumber: 8,
        question_id: "SCI_Q007",
        mission_id: "SCI_M001",
        competency_id: "SCI_COMP01",
        subcompetency_id: "SCI_SUB01",
        question_type: "imageChoice",
        question_text: "Gambar mana yang menunjukkan makhluk hidup?",
        instruction: "Pilih satu gambar.",
        correct_answer: "A",
        scoring_rule: "Isi image_url pada QUESTION_OPTIONS dan tandai kunci.",
        difficulty: "Easy",
        bloom_level: "Understand",
        measurement_category: "Visual",
        skill_tags: "gambar,klasifikasi",
        mastery_point: "10",
        xp_reward: "10",
        estimated_time_seconds: "60",
      },
      {
        _rowNumber: 9,
        question_id: "SCI_Q008",
        mission_id: "SCI_M001",
        competency_id: "SCI_COMP01",
        subcompetency_id: "SCI_SUB01",
        question_type: "audioChoice",
        question_text: "Dengarkan audio. Suara mana yang berasal dari makhluk hidup?",
        instruction: "Putar audio lalu pilih jawaban.",
        correct_answer: "B",
        scoring_rule: "Isi audio di QUESTION_MEDIA, pilihan jawaban di QUESTION_OPTIONS.",
        difficulty: "Easy",
        bloom_level: "Understand",
        measurement_category: "Audio",
        skill_tags: "audio,observasi",
        mastery_point: "10",
        xp_reward: "10",
        estimated_time_seconds: "90",
      },
      {
        _rowNumber: 10,
        question_id: "SCI_Q009",
        mission_id: "SCI_M001",
        competency_id: "SCI_COMP01",
        subcompetency_id: "SCI_SUB01",
        question_type: "longText",
        question_text: "Jelaskan mengapa tanaman kacang hijau termasuk makhluk hidup.",
        instruction: "Tulis penjelasan 3-5 kalimat.",
        correct_answer: "Dinilai dengan rubrik",
        scoring_rule: "Isi kriteria penilaian di RUBRIC_CRITERIA.",
        difficulty: "Medium",
        bloom_level: "Analyze",
        measurement_category: "Penalaran",
        skill_tags: "argumentasi",
        mastery_point: "20",
        xp_reward: "20",
        estimated_time_seconds: "180",
      },
      {
        _rowNumber: 11,
        question_id: "SCI_Q010",
        mission_id: "SCI_M001",
        competency_id: "SCI_COMP01",
        subcompetency_id: "SCI_SUB01",
        question_type: "codeInput",
        question_text: "Lengkapi fungsi untuk mengembalikan teks 'hidup'.",
        instruction: "Tulis kode sederhana.",
        correct_answer: "Output: hidup",
        scoring_rule: "Isi bahasa dan expected_output di CODE_CONFIG.",
        difficulty: "Medium",
        bloom_level: "Apply",
        measurement_category: "Komputasi",
        skill_tags: "kode",
        mastery_point: "20",
        xp_reward: "20",
        estimated_time_seconds: "180",
      },
      {
        _rowNumber: 12,
        question_id: "SCI_Q011",
        mission_id: "SCI_M001",
        competency_id: "SCI_COMP01",
        subcompetency_id: "SCI_SUB01",
        question_type: "imageHotspot",
        question_text: "Klik bagian tanaman yang digunakan untuk menyerap air.",
        instruction: "Pilih area pada gambar.",
        correct_answer: "Akar",
        scoring_rule: "Isi area benar di HOTSPOT_AREAS dengan is_correct=Yes.",
        difficulty: "Medium",
        bloom_level: "Apply",
        measurement_category: "Visual",
        skill_tags: "gambar,tanaman",
        mastery_point: "10",
        xp_reward: "15",
        estimated_time_seconds: "90",
      },
      {
        _rowNumber: 13,
        question_id: "SCI_Q012",
        mission_id: "SCI_M001",
        competency_id: "SCI_COMP01",
        subcompetency_id: "SCI_SUB01",
        question_type: "voiceResponse",
        question_text: "Jelaskan dengan suara satu bukti bahwa tanaman adalah makhluk hidup.",
        instruction: "Rekam jawaban singkat.",
        correct_answer: "Dinilai dengan rubrik",
        scoring_rule: "Isi kriteria penilaian di RUBRIC_CRITERIA.",
        difficulty: "Medium",
        bloom_level: "Analyze",
        measurement_category: "Komunikasi",
        skill_tags: "lisan,argumentasi",
        mastery_point: "20",
        xp_reward: "20",
        estimated_time_seconds: "120",
      },
      {
        _rowNumber: 14,
        question_id: "SCI_Q013",
        mission_id: "SCI_M001",
        competency_id: "SCI_COMP01",
        subcompetency_id: "SCI_SUB01",
        question_type: "timelineBuilder",
        question_text: "Susun timeline pertumbuhan kacang hijau.",
        instruction: "Urutkan kejadian berdasarkan waktu.",
        correct_answer: "Lihat ORDER_TIMELINE_ITEMS",
        scoring_rule: "Gunakan item_kind=timeline dan correct_position.",
        difficulty: "Medium",
        bloom_level: "Apply",
        measurement_category: "Proses",
        skill_tags: "timeline,pertumbuhan",
        mastery_point: "10",
        xp_reward: "15",
        estimated_time_seconds: "90",
      },
      {
        _rowNumber: 15,
        question_id: "SCI_Q014",
        mission_id: "SCI_M001",
        competency_id: "SCI_COMP01",
        subcompetency_id: "SCI_SUB01",
        question_type: "evidenceBoard",
        question_text: "Pilih bukti yang mendukung bahwa objek adalah makhluk hidup.",
        instruction: "Pilih semua bukti yang relevan.",
        correct_answer: "Lihat EVIDENCE_ITEMS",
        scoring_rule: "Tandai evidence benar dengan is_correct_evidence=Yes.",
        difficulty: "Medium",
        bloom_level: "Analyze",
        measurement_category: "Bukti",
        skill_tags: "bukti,penalaran",
        mastery_point: "20",
        xp_reward: "20",
        estimated_time_seconds: "120",
      },
    ],
    QUESTION_TYPE_CONFIG: [
      {
        _rowNumber: 2,
        question_id: "SCI_Q002",
        input_mode: "multi",
        max_length: "",
        case_sensitive: "No",
        allow_empty: "No",
        allow_unit: "No",
        scoring_config: "all_or_nothing",
        sample_answer: "A;C",
      },
      {
        _rowNumber: 3,
        question_id: "SCI_Q004",
        input_mode: "text",
        max_length: "80",
        case_sensitive: "No",
        allow_empty: "No",
        allow_unit: "No",
        scoring_config: "accepted_answers",
        sample_answer: "bernapas",
      },
      {
        _rowNumber: 4,
        question_id: "SCI_Q009",
        input_mode: "textarea",
        max_length: "600",
        case_sensitive: "No",
        allow_empty: "No",
        allow_unit: "No",
        scoring_config: "rubric_review",
        sample_answer: "Tanaman tumbuh, membutuhkan air, dan memiliki akar.",
      },
      {
        _rowNumber: 5,
        question_id: "SCI_Q012",
        input_mode: "voice",
        max_length: "120",
        case_sensitive: "No",
        allow_empty: "No",
        allow_unit: "No",
        scoring_config: "rubric_review",
        sample_answer: "Tanaman bertambah tinggi sehingga termasuk makhluk hidup.",
      },
    ],
    QUESTION_OPTIONS: [
      {
        _rowNumber: 2,
        question_id: "SCI_Q001",
        option_id: "A",
        label: "Objek bertambah besar dari waktu ke waktu.",
        description: "Menunjukkan ciri tumbuh.",
        image_url: "",
        is_correct: "Yes",
        misconception: "",
        display_order: "1",
      },
      {
        _rowNumber: 3,
        question_id: "SCI_Q001",
        option_id: "B",
        label: "Objek berwarna kuning.",
        description: "Warna saja bukan bukti hidup.",
        image_url: "",
        is_correct: "No",
        misconception: "Mengira warna menentukan makhluk hidup.",
        display_order: "2",
      },
      {
        _rowNumber: 4,
        question_id: "SCI_Q001",
        option_id: "C",
        label: "Objek berada di halaman.",
        description: "Lokasi bukan ciri makhluk hidup.",
        image_url: "",
        is_correct: "No",
        misconception: "",
        display_order: "3",
      },
      {
        _rowNumber: 5,
        question_id: "SCI_Q001",
        option_id: "D",
        label: "Objek berbentuk bulat.",
        description: "Bentuk bukan ciri makhluk hidup.",
        image_url: "",
        is_correct: "No",
        misconception: "",
        display_order: "4",
      },
      {
        _rowNumber: 6,
        question_id: "SCI_Q002",
        option_id: "A",
        label: "Bernapas",
        description: "",
        image_url: "",
        is_correct: "Yes",
        misconception: "",
        display_order: "1",
      },
      {
        _rowNumber: 7,
        question_id: "SCI_Q002",
        option_id: "B",
        label: "Berwarna merah",
        description: "",
        image_url: "",
        is_correct: "No",
        misconception: "Warna dianggap ciri hidup.",
        display_order: "2",
      },
      {
        _rowNumber: 8,
        question_id: "SCI_Q002",
        option_id: "C",
        label: "Berkembang biak",
        description: "",
        image_url: "",
        is_correct: "Yes",
        misconception: "",
        display_order: "3",
      },
      {
        _rowNumber: 9,
        question_id: "SCI_Q002",
        option_id: "D",
        label: "Terbuat dari plastik",
        description: "",
        image_url: "",
        is_correct: "No",
        misconception: "",
        display_order: "4",
      },
      {
        _rowNumber: 10,
        question_id: "SCI_Q003",
        option_id: "A",
        label: "Benar",
        description: "",
        image_url: "",
        is_correct: "No",
        misconception: "Mengira semua gerak berarti hidup.",
        display_order: "1",
      },
      {
        _rowNumber: 11,
        question_id: "SCI_Q003",
        option_id: "B",
        label: "Salah",
        description: "",
        image_url: "",
        is_correct: "Yes",
        misconception: "",
        display_order: "2",
      },
      {
        _rowNumber: 12,
        question_id: "SCI_Q007",
        option_id: "A",
        label: "Tanaman kacang hijau",
        description: "",
        image_url: "https://example.com/tanaman-kacang-hijau.png",
        is_correct: "Yes",
        misconception: "",
        display_order: "1",
      },
      {
        _rowNumber: 13,
        question_id: "SCI_Q007",
        option_id: "B",
        label: "Batu",
        description: "",
        image_url: "https://example.com/batu.png",
        is_correct: "No",
        misconception: "",
        display_order: "2",
      },
      {
        _rowNumber: 14,
        question_id: "SCI_Q008",
        option_id: "A",
        label: "Suara bel listrik",
        description: "",
        image_url: "",
        is_correct: "No",
        misconception: "",
        display_order: "1",
      },
      {
        _rowNumber: 15,
        question_id: "SCI_Q008",
        option_id: "B",
        label: "Suara burung",
        description: "",
        image_url: "",
        is_correct: "Yes",
        misconception: "",
        display_order: "2",
      },
    ],
    MATCHING_PAIRS: [
      {
        _rowNumber: 2,
        question_id: "SCI_Q005",
        left_id: "L1",
        left_label: "Tumbuh",
        right_id: "R1",
        right_label: "Batang tanaman makin tinggi",
        pair_order: "1",
      },
      {
        _rowNumber: 3,
        question_id: "SCI_Q005",
        left_id: "L2",
        left_label: "Bernapas",
        right_id: "R2",
        right_label: "Ikan mengambil oksigen dari air",
        pair_order: "2",
      },
    ],
    ORDER_TIMELINE_ITEMS: [
      {
        _rowNumber: 2,
        question_id: "SCI_Q006",
        item_kind: "ordering",
        item_id: "STEP1",
        label: "Siapkan kapas basah dan biji kacang hijau",
        time_label: "",
        description: "",
        display_order: "1",
        correct_position: "1",
      },
      {
        _rowNumber: 3,
        question_id: "SCI_Q006",
        item_kind: "ordering",
        item_id: "STEP2",
        label: "Amati perubahan tinggi setiap hari",
        time_label: "",
        description: "",
        display_order: "2",
        correct_position: "2",
      },
      {
        _rowNumber: 4,
        question_id: "SCI_Q013",
        item_kind: "timeline",
        item_id: "DAY1",
        label: "Biji mulai menyerap air",
        time_label: "Hari 1",
        description: "Biji terlihat membesar.",
        display_order: "1",
        correct_position: "1",
      },
      {
        _rowNumber: 5,
        question_id: "SCI_Q013",
        item_kind: "timeline",
        item_id: "DAY3",
        label: "Akar kecil muncul",
        time_label: "Hari 3",
        description: "Akar mulai keluar dari biji.",
        display_order: "2",
        correct_position: "2",
      },
    ],
    ACCEPTED_ANSWERS: [
      {
        _rowNumber: 2,
        question_id: "SCI_Q004",
        accepted_answer: "bernapas",
        normalized_answer: "bernapas",
        tolerance_numeric: "",
        unit: "",
        is_primary: "Yes",
      },
      {
        _rowNumber: 3,
        question_id: "SCI_Q004",
        accepted_answer: "tumbuh",
        normalized_answer: "tumbuh",
        tolerance_numeric: "",
        unit: "",
        is_primary: "No",
      },
    ],
    RUBRIC_CRITERIA: [
      {
        _rowNumber: 2,
        question_id: "SCI_Q009",
        criterion_id: "C1",
        criterion: "Menyebutkan bukti hidup",
        criterion_description: "Jawaban memuat ciri tumbuh, bernapas, atau membutuhkan makanan/air.",
        weight_pct: "60",
        score_1_description: "Tidak menyebutkan bukti relevan.",
        score_2_description: "Menyebutkan bukti tetapi kurang tepat.",
        score_3_description: "Menyebutkan satu bukti tepat.",
        score_4_description: "Menyebutkan beberapa bukti tepat dan jelas.",
      },
      {
        _rowNumber: 3,
        question_id: "SCI_Q012",
        criterion_id: "C1",
        criterion: "Kejelasan alasan lisan",
        criterion_description: "Jawaban suara menjelaskan bukti dengan kalimat lengkap.",
        weight_pct: "100",
        score_1_description: "Tidak jelas.",
        score_2_description: "Ada alasan tetapi belum akurat.",
        score_3_description: "Alasan akurat.",
        score_4_description: "Alasan akurat dan didukung contoh.",
      },
    ],
    QUESTION_MEDIA: [
      {
        _rowNumber: 2,
        question_id: "SCI_Q008",
        media_type: "audio",
        url: "https://example.com/audio-suara-observasi.mp3",
        duration_seconds: "20",
        max_replay: "2",
        transcript_available: "Yes",
        transcript: "Suara bel listrik lalu suara burung.",
        alt_text: "",
      },
      {
        _rowNumber: 3,
        question_id: "SCI_Q011",
        media_type: "image",
        url: "https://example.com/bagian-tanaman.png",
        duration_seconds: "",
        max_replay: "",
        transcript_available: "No",
        transcript: "",
        alt_text: "Gambar tanaman dengan akar, batang, dan daun.",
      },
    ],
    HOTSPOT_AREAS: [
      {
        _rowNumber: 2,
        question_id: "SCI_Q011",
        hotspot_id: "ROOT",
        label: "Akar",
        x_relative: "0.50",
        y_relative: "0.82",
        radius_relative: "0.08",
        is_correct: "Yes",
        misconception: "",
      },
      {
        _rowNumber: 3,
        question_id: "SCI_Q011",
        hotspot_id: "LEAF",
        label: "Daun",
        x_relative: "0.42",
        y_relative: "0.35",
        radius_relative: "0.08",
        is_correct: "No",
        misconception: "Daun dikira bagian penyerap air utama.",
      },
    ],
    EVIDENCE_ITEMS: [
      {
        _rowNumber: 2,
        question_id: "SCI_Q014",
        evidence_id: "E1",
        label: "Tinggi tanaman bertambah setiap hari",
        description: "Data pengamatan menunjukkan tanaman tumbuh.",
        category: "Data pengamatan",
        is_correct_evidence: "Yes",
        misconception: "",
        display_order: "1",
      },
      {
        _rowNumber: 3,
        question_id: "SCI_Q014",
        evidence_id: "E2",
        label: "Pot tanaman berwarna biru",
        description: "Warna pot tidak membuktikan makhluk hidup.",
        category: "Distraktor",
        is_correct_evidence: "No",
        misconception: "Mengambil bukti yang tidak relevan.",
        display_order: "2",
      },
    ],
    CODE_CONFIG: [
      {
        _rowNumber: 2,
        question_id: "SCI_Q010",
        language: "javascript",
        initial_code: "function jawab() {\n  return \"\";\n}",
        read_only_prefix: "",
        expected_output: "hidup",
        backend_execution_enabled: "No",
        test_cases_json: "[{\"input\":null,\"expected\":\"hidup\"}]",
      },
    ],
  };
  return rows[sheetName] ?? [];
}
