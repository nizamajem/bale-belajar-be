import { PrismaClient } from '@prisma/client';
import { seedKorean } from '../prisma/seed-korean';
import { validateKoreanCourse } from '../prisma/korean-course-data';
async function main() {
  if (process.argv.includes('--validate')) { console.log(validateKoreanCourse()); return; }
  const prisma = new PrismaClient();
  try { await seedKorean(prisma); } finally { await prisma.$disconnect(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
