import { Prisma, PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import { join } from 'path';

const prisma = new PrismaClient();

interface SheetRow {
  _rowNumber: number;
  [key: string]: string | number;
}

interface SheetData {
  headerRowNumber?: number;
  headers: string[];
  rows: SheetRow[];
}

interface CurriculumExport {
  workbook: string;
  sourcePath: string;
  sheets: Record<string, SheetData>;
}

async function main() {
  const jsonPath = join(__dirname, 'curriculum-data.json');
  const data: CurriculumExport = JSON.parse(readFileSync(jsonPath, 'utf-8'));

  let imported = 0;
  let sheetsWithData = 0;

  for (const [sheetName, sheet] of Object.entries(data.sheets)) {
    const rows = sheet.rows ?? [];
    if (rows.length === 0) {
      continue;
    }
    sheetsWithData += 1;
    const idHeader = sheet.headers?.[0];

    for (const row of rows) {
      const { _rowNumber, ...fields } = row;
      const sourceId = idHeader ? ((fields[idHeader] as string) ?? null) : null;

      await prisma.curriculumSourceRecord.upsert({
        where: {
          workbook_sheetName_rowNumber: {
            workbook: data.workbook,
            sheetName,
            rowNumber: _rowNumber,
          },
        },
        create: {
          workbook: data.workbook,
          sheetName,
          rowNumber: _rowNumber,
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
    console.error('Curriculum import gagal:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
