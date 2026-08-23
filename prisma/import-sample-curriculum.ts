import { Prisma, PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import { join } from 'path';

const prisma = new PrismaClient();

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

async function main() {
  const jsonPath =
    process.argv[2] ??
    join(process.cwd(), 'import-samples', 'scientia-all-templates-test.json');
  const data = JSON.parse(readFileSync(jsonPath, 'utf-8')) as CurriculumExport;

  if (!data.workbook || !data.sheets) {
    throw new Error('File sample curriculum tidak valid.');
  }

  let imported = 0;
  let sheetsWithData = 0;

  for (const [sheetName, sheet] of Object.entries(data.sheets)) {
    const rows = sheet.rows ?? [];
    if (rows.length === 0) continue;
    sheetsWithData += 1;
    const idHeader = sheet.headers?.[0];

    for (const [index, row] of rows.entries()) {
      const { _rowNumber, ...fields } = row;
      const rowNumber = Number(_rowNumber ?? index + 2);
      const sourceId = idHeader ? String(fields[idHeader] ?? '') || null : null;

      await prisma.curriculumSourceRecord.upsert({
        where: {
          workbook_sheetName_rowNumber: {
            workbook: data.workbook,
            sheetName,
            rowNumber,
          },
        },
        create: {
          workbook: data.workbook,
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

  console.log(
    `Imported ${imported} baris dari ${sheetsWithData} sheet ke CurriculumSourceRecord (workbook=${data.workbook}).`,
  );
}

main()
  .catch((error) => {
    console.error('Sample curriculum import gagal:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
