import { PrismaClient } from "@prisma/client";

const { buildVocabSeed } =
  require("../prisma/vocab-seed-data.ts") as typeof import("../prisma/vocab-seed-data");

const prisma = new PrismaClient();
const CHUNK_SIZE = 500;

async function main() {
  const vocabSeed = buildVocabSeed(20_000);

  for (const categorySeed of vocabSeed) {
    const category = await prisma.vocabCategory.upsert({
      where: { key: categorySeed.key },
      update: { name: categorySeed.name, isActive: true },
      create: { key: categorySeed.key, name: categorySeed.name, isActive: true },
    });

    for (let index = 0; index < categorySeed.words.length; index += CHUNK_SIZE) {
      const chunk = categorySeed.words.slice(index, index + CHUNK_SIZE);
      await prisma.vocabWord.createMany({
        data: chunk.map((word) => ({
          categoryId: category.id,
          english: word.english,
          indonesian: word.indonesian,
          korean: word.korean,
          koreanRomanized: word.koreanRomanized,
          exampleSentenceEn: word.exampleSentenceEn,
          exampleSentenceKo: word.exampleSentenceKo,
          level: word.level,
          isActive: true,
        })),
        skipDuplicates: true,
      });
      await prisma.$transaction(
        chunk.map((word) =>
          prisma.vocabWord.updateMany({
            where: { categoryId: category.id, english: word.english },
            data: { indonesian: word.indonesian },
          }),
        ),
      );
    }
  }

  const totalActive = await prisma.vocabWord.count({ where: { isActive: true } });
  const totalCategories = await prisma.vocabCategory.count();
  console.log(
    `Seeded vocab bank: ${totalActive} active words across ${totalCategories} categories.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
