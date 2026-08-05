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
        difficulty: "Easy",
        mastery_point: "10",
        xp_reward: "10",
      },
    ],
    QUESTION_OPTIONS: [
      {
        _rowNumber: 2,
        question_id: "SCI_Q001",
        option_id: "A",
        label: "Objek bertambah besar dari waktu ke waktu.",
        is_correct: "Yes",
      },
      {
        _rowNumber: 3,
        question_id: "SCI_Q001",
        option_id: "B",
        label: "Objek berwarna kuning.",
        is_correct: "No",
      },
    ],
  };
  return rows[sheetName] ?? [];
}
