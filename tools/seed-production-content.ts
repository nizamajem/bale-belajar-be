import {
  MissionStatus,
  Prisma,
  PrismaClient,
  QuestionStatus,
  QuestQuestionType,
} from "@prisma/client";

const prisma = new PrismaClient();

type WorldSeed = {
  key: string;
  name: string;
  subjectCode: string;
  subjectName: string;
  characterClass: string;
  themeDescription: string;
  orderNumber: number;
  chapter: {
    code: string;
    title: string;
    story: string;
    goal: string;
  };
  competency: {
    code: string;
    name: string;
    description: string;
    gradeLevel?: number;
  };
  quests: Array<{
    code: string;
    title: string;
    story: string;
    objective: string;
    instruction: string;
    type?: QuestQuestionType;
    question: string;
    options?: Array<{ id: string; label: string; correct: boolean }>;
    codeConfig?: {
      language: string;
      initialCode: string;
      expectedOutput: string;
      testCases: Prisma.InputJsonValue;
    };
  }>;
};

const worlds: WorldSeed[] = [
  {
    key: "numeria",
    name: "Numeria",
    subjectCode: "MTK",
    subjectName: "Matematika",
    characterClass: "Arsitek Logika",
    themeDescription: "Latihan matematika lewat teka-teki ringan.",
    orderNumber: 1,
    chapter: {
      code: "NUM-CH-001",
      title: "Gerbang Distribusi",
      story:
        "Babe membuka gerbang angka pertama dan mengajakmu mengenali pola dasar.",
      goal: "Memahami operasi dasar dan pola sederhana.",
    },
    competency: {
      code: "NUM-POLA-DASAR",
      name: "Pola dan Operasi Dasar",
      description: "Mengenali pola, operasi hitung, dan alasan sederhana.",
      gradeLevel: 7,
    },
    quests: [
      {
        code: "NUM-QST-001",
        title: "Pola Angka Pertama",
        story: "Urutan angka di papan desa hilang satu.",
        objective: "Menentukan angka berikutnya dari pola sederhana.",
        instruction: "Pilih jawaban yang melanjutkan pola.",
        question: "Pola 2, 4, 6, 8, ... dilanjutkan dengan angka berapa?",
        options: [
          { id: "A", label: "9", correct: false },
          { id: "B", label: "10", correct: true },
          { id: "C", label: "12", correct: false },
          { id: "D", label: "16", correct: false },
        ],
      },
      {
        code: "NUM-QST-002",
        title: "Gerbang Penjumlahan",
        story: "Dua batu angka harus digabung agar gerbang terbuka.",
        objective: "Menghitung penjumlahan cepat.",
        instruction: "Pilih hasil yang tepat.",
        question: "Berapakah 18 + 7?",
        options: [
          { id: "A", label: "23", correct: false },
          { id: "B", label: "24", correct: false },
          { id: "C", label: "25", correct: true },
          { id: "D", label: "26", correct: false },
        ],
      },
      {
        code: "NUM-QST-003",
        title: "Kunci Perkalian",
        story: "Kunci kuning hanya cocok dengan hasil perkalian yang benar.",
        objective: "Menggunakan perkalian dasar.",
        instruction: "Pilih hasil perkalian.",
        question: "Berapakah 6 x 7?",
        options: [
          { id: "A", label: "36", correct: false },
          { id: "B", label: "42", correct: true },
          { id: "C", label: "48", correct: false },
          { id: "D", label: "49", correct: false },
        ],
      },
      {
        code: "NUM-QST-004",
        title: "Angka yang Hilang",
        story: "Satu angka terhapus dari papan misi.",
        objective: "Mencari nilai yang belum diketahui.",
        instruction: "Pilih nilai x.",
        question: "Jika x + 9 = 15, maka x adalah...",
        options: [
          { id: "A", label: "4", correct: false },
          { id: "B", label: "5", correct: false },
          { id: "C", label: "6", correct: true },
          { id: "D", label: "7", correct: false },
        ],
      },
      {
        code: "NUM-QST-005",
        title: "Bandingkan Nilai",
        story: "Dua peti angka harus dibandingkan sebelum dibuka.",
        objective: "Membandingkan bilangan sederhana.",
        instruction: "Pilih pernyataan yang benar.",
        question: "Manakah yang benar?",
        options: [
          { id: "A", label: "35 lebih besar dari 53", correct: false },
          { id: "B", label: "53 lebih besar dari 35", correct: true },
          { id: "C", label: "35 sama dengan 53", correct: false },
          { id: "D", label: "53 lebih kecil dari 35", correct: false },
        ],
      },
    ],
  },
  {
    key: "detectivia",
    name: "Detectivia",
    subjectCode: "DETEKTIF",
    subjectName: "Deteksi & Logika",
    characterClass: "Bale Sleuth",
    themeDescription: "Observasi dan analisis bukti lewat kasus ringan.",
    orderNumber: 2,
    chapter: {
      code: "DET-CH-001",
      title: "Kamp Observasi",
      story: "Babe mengajakmu melihat petunjuk kecil sebelum menyimpulkan.",
      goal: "Membedakan fakta, asumsi, dan bukti pendukung.",
    },
    competency: {
      code: "DET-OBS-DASAR",
      name: "Observasi Bukti Dasar",
      description: "Mengamati detail dan menyimpulkan berdasarkan bukti.",
      gradeLevel: 7,
    },
    quests: [
      {
        code: "DET-QST-001",
        title: "Fakta atau Dugaan",
        story: "Ada jejak sepatu di dekat taman sekolah.",
        objective: "Membedakan fakta dan dugaan.",
        instruction: "Pilih pernyataan yang benar-benar fakta.",
        question: "Manakah yang termasuk fakta?",
        options: [
          { id: "A", label: "Pelakunya pasti berlari.", correct: false },
          { id: "B", label: "Ada jejak sepatu di tanah basah.", correct: true },
          { id: "C", label: "Pemilik sepatu pasti bersalah.", correct: false },
          { id: "D", label: "Semua orang panik.", correct: false },
        ],
      },
      {
        code: "DET-QST-002",
        title: "Bukti Terkuat",
        story: "Tiga bukti ditemukan di ruang kelas.",
        objective: "Memilih bukti paling kuat.",
        instruction: "Pilih bukti yang paling bisa dicek.",
        question: "Bukti mana yang paling kuat?",
        options: [
          { id: "A", label: "Rumor dari koridor.", correct: false },
          { id: "B", label: "Catatan waktu dari kamera.", correct: true },
          { id: "C", label: "Tebakan teman.", correct: false },
          { id: "D", label: "Perasaan saksi.", correct: false },
        ],
      },
      {
        code: "DET-QST-003",
        title: "Kesimpulan Adil",
        story: "Seseorang terlihat dekat lemari sebelum barang hilang.",
        objective: "Menghindari tuduhan tanpa bukti cukup.",
        instruction: "Pilih kesimpulan yang paling adil.",
        question: "Kesimpulan mana yang paling aman?",
        options: [
          { id: "A", label: "Dia pasti mengambil barang.", correct: false },
          {
            id: "B",
            label: "Dia perlu ditanya karena berada di dekat lemari.",
            correct: true,
          },
          { id: "C", label: "Semua saksi salah.", correct: false },
          { id: "D", label: "Kasus selesai.", correct: false },
        ],
      },
      {
        code: "DET-QST-004",
        title: "Urutan Kejadian",
        story: "Bel, chat, dan foto memberi petunjuk waktu.",
        objective: "Menggunakan waktu sebagai jangkar kronologi.",
        instruction: "Pilih bukti yang membantu menyusun urutan.",
        question: "Bukti apa yang paling membantu menyusun kronologi?",
        options: [
          { id: "A", label: "Warna tas.", correct: false },
          { id: "B", label: "Jam pada log pintu.", correct: true },
          { id: "C", label: "Komentar lucu teman.", correct: false },
          { id: "D", label: "Ukuran ruangan.", correct: false },
        ],
      },
      {
        code: "DET-QST-005",
        title: "Pertanyaan Netral",
        story: "Saksi belum yakin dengan ciri orang yang dilihat.",
        objective: "Memilih pertanyaan yang tidak menuduh.",
        instruction: "Pilih pertanyaan paling netral.",
        question: "Pertanyaan mana yang paling netral untuk saksi?",
        options: [
          { id: "A", label: "Kamu yakin dia pelakunya, kan?", correct: false },
          {
            id: "B",
            label: "Apa saja yang kamu lihat saat itu?",
            correct: true,
          },
          { id: "C", label: "Kenapa kamu tidak mengejar dia?", correct: false },
          { id: "D", label: "Dia terlihat bersalah?", correct: false },
        ],
      },
    ],
  },
  {
    key: "kodex",
    name: "KodeX",
    subjectCode: "KODEX",
    subjectName: "Informatika",
    characterClass: "Penyusun Algoritma",
    themeDescription: "Belajar logika komputer tanpa terasa berat.",
    orderNumber: 3,
    chapter: {
      code: "KDX-CH-001",
      title: "Langkah Algoritma",
      story:
        "Babe menyalakan terminal pertama dan mengajakmu menyusun instruksi.",
      goal: "Mengenal urutan, kondisi, dan kode sederhana.",
    },
    competency: {
      code: "KDX-ALG-DASAR",
      name: "Algoritma Dasar",
      description: "Menyusun langkah logis dan membaca kode sederhana.",
      gradeLevel: 7,
    },
    quests: [
      {
        code: "KDX-QST-001",
        title: "Urutan Instruksi",
        story: "Robot kecil harus diberi perintah yang runtut.",
        objective: "Mengenali urutan algoritma.",
        instruction: "Pilih langkah pertama.",
        question:
          "Untuk membuat teh, langkah pertama yang paling tepat adalah...",
        options: [
          { id: "A", label: "Minum teh.", correct: false },
          { id: "B", label: "Siapkan gelas.", correct: true },
          { id: "C", label: "Buang gelas.", correct: false },
          { id: "D", label: "Matikan lampu.", correct: false },
        ],
      },
      {
        code: "KDX-QST-002",
        title: "Kondisi Jika",
        story: "Pintu digital hanya terbuka jika kode benar.",
        objective: "Memahami kondisi if.",
        instruction: "Pilih arti kondisi.",
        question: "Arti dari 'jika hujan, pakai payung' adalah...",
        options: [
          { id: "A", label: "Selalu pakai payung.", correct: false },
          { id: "B", label: "Pakai payung hanya saat hujan.", correct: true },
          { id: "C", label: "Tidak pernah pakai payung.", correct: false },
          { id: "D", label: "Hujan selalu berhenti.", correct: false },
        ],
      },
      {
        code: "KDX-QST-003",
        title: "Output Kode",
        story: "Terminal menampilkan hasil dari perintah kecil.",
        objective: "Memprediksi output sederhana.",
        instruction: "Pilih output program.",
        question: "Jika program menjalankan print('Bale'), outputnya adalah...",
        options: [
          { id: "A", label: "Bale", correct: true },
          { id: "B", label: "print", correct: false },
          { id: "C", label: "Error selalu", correct: false },
          { id: "D", label: "Kosong", correct: false },
        ],
      },
      {
        code: "KDX-QST-004",
        title: "Perbaiki Variabel",
        story: "Kode singkat perlu dilengkapi agar menampilkan sapaan.",
        objective: "Menulis potongan kode sederhana.",
        instruction: "Lengkapi kode agar outputnya Halo Bale.",
        type: QuestQuestionType.CODE_INPUT,
        question:
          "Tulis kode Python yang menyimpan nama 'Bale' lalu mencetak 'Halo Bale'.",
        codeConfig: {
          language: "python",
          initialCode: 'nama = "Bale"\n# tulis kodemu di bawah ini\n',
          expectedOutput: "Halo Bale",
          testCases: [{ input: "", expectedOutput: "Halo Bale" }],
        },
      },
      {
        code: "KDX-QST-005",
        title: "Bug Sederhana",
        story: "Satu baris logika membuat robot salah jalan.",
        objective: "Mengenali bug sederhana.",
        instruction: "Pilih penyebab bug.",
        question:
          "Jika robot diminta maju 3 langkah tapi hanya maju 2, kemungkinan bug-nya adalah...",
        options: [
          {
            id: "A",
            label: "Jumlah pengulangan terlalu sedikit.",
            correct: true,
          },
          { id: "B", label: "Warna robot salah.", correct: false },
          { id: "C", label: "Nama robot terlalu panjang.", correct: false },
          { id: "D", label: "Layar terlalu terang.", correct: false },
        ],
      },
    ],
  },
];

async function upsertPlacementCodeInput() {
  await prisma.placementQuestionTemplate.upsert({
    where: { code: "TPL-CODE-INPUT-001" },
    update: {
      orderNumber: 10,
      questionType: "CODE_INPUT",
      prompt: "Lengkapi kode agar mencetak Halo Bale.",
      payload: {
        id: "TPL-CODE-INPUT-001",
        questionType: "CODE_INPUT",
        title: "Template 10 - Code Input",
        mascotMessage: "Hai, aku Babe! Sekarang tulis sedikit kode sederhana.",
        prompt: "Lengkapi kode agar mencetak Halo Bale.",
        instruction: "Gunakan Python sederhana.",
        codeConfig: {
          language: "python",
          initialCode: 'nama = "Bale"\n# tulis kodemu di bawah ini\n',
          expectedOutput: "Halo Bale",
          backendExecutionEnabled: false,
        },
      },
      isActive: true,
    },
    create: {
      code: "TPL-CODE-INPUT-001",
      orderNumber: 10,
      questionType: "CODE_INPUT",
      prompt: "Lengkapi kode agar mencetak Halo Bale.",
      payload: {
        id: "TPL-CODE-INPUT-001",
        questionType: "CODE_INPUT",
        title: "Template 10 - Code Input",
        mascotMessage: "Hai, aku Babe! Sekarang tulis sedikit kode sederhana.",
        prompt: "Lengkapi kode agar mencetak Halo Bale.",
        instruction: "Gunakan Python sederhana.",
        codeConfig: {
          language: "python",
          initialCode: 'nama = "Bale"\n# tulis kodemu di bawah ini\n',
          expectedOutput: "Halo Bale",
          backendExecutionEnabled: false,
        },
      },
      source: "PRODUCTION_MINIMUM_SEED",
      isActive: true,
    },
  });
}

async function seedWorld(input: WorldSeed) {
  const subject = await prisma.subject.upsert({
    where: { code: input.subjectCode },
    update: { name: input.subjectName, isActive: true },
    create: {
      code: input.subjectCode,
      name: input.subjectName,
      description: input.themeDescription,
    },
  });

  const world = await prisma.world.upsert({
    where: { key: input.key },
    update: {
      subjectId: subject.id,
      name: input.name,
      characterClass: input.characterClass,
      themeDescription: input.themeDescription,
      isActive: true,
      orderNumber: input.orderNumber,
    },
    create: {
      subjectId: subject.id,
      key: input.key,
      name: input.name,
      characterClass: input.characterClass,
      themeDescription: input.themeDescription,
      orderNumber: input.orderNumber,
    },
  });

  const chapter = await prisma.chapter.upsert({
    where: { chapterCode: input.chapter.code },
    update: {
      worldId: world.id,
      title: input.chapter.title,
      story: input.chapter.story,
      goal: input.chapter.goal,
      status: MissionStatus.ACTIVE,
    },
    create: {
      worldId: world.id,
      chapterCode: input.chapter.code,
      chapterNumber: 1,
      title: input.chapter.title,
      story: input.chapter.story,
      goal: input.chapter.goal,
      difficulty: "FOUNDATION",
      estimatedDurationDays: 3,
      recommendedSessions: 5,
      completionIndicator: "Selesaikan semua quest awal.",
      status: MissionStatus.ACTIVE,
    },
  });

  const competency = await prisma.competency.upsert({
    where: {
      subjectId_code: {
        subjectId: subject.id,
        code: input.competency.code,
      },
    },
    update: {
      chapterId: chapter.id,
      name: input.competency.name,
      description: input.competency.description,
      gradeLevel: input.competency.gradeLevel,
      isActive: true,
    },
    create: {
      subjectId: subject.id,
      chapterId: chapter.id,
      code: input.competency.code,
      name: input.competency.name,
      description: input.competency.description,
      gradeLevel: input.competency.gradeLevel,
      orderNumber: 1,
    },
  });

  for (const [index, questInput] of input.quests.entries()) {
    const quest = await prisma.quest.upsert({
      where: { code: questInput.code },
      update: {
        worldId: world.id,
        chapterId: chapter.id,
        title: questInput.title,
        story: questInput.story,
        objective: questInput.objective,
        studentInstruction: questInput.instruction,
        estimatedMinutes: 8,
        xpRewardFirst: 90,
        status: MissionStatus.ACTIVE,
      },
      create: {
        worldId: world.id,
        chapterId: chapter.id,
        code: questInput.code,
        title: questInput.title,
        missionType: "FOUNDATION",
        story: questInput.story,
        objective: questInput.objective,
        studentInstruction: questInput.instruction,
        estimatedMinutes: 8,
        xpRewardFirst: 90,
        xpMultiplierSecond: 0.5,
        xpMultiplierThirdPlus: 0.25,
        hints: [
          "Baca pertanyaannya pelan-pelan.",
          "Cari pilihan yang paling didukung informasi.",
        ],
        status: MissionStatus.ACTIVE,
      },
    });

    const questionType = questInput.type ?? QuestQuestionType.SINGLE_CHOICE;
    const question = await prisma.questQuestion.upsert({
      where: { code: `${questInput.code}-Q1` },
      update: {
        questId: quest.id,
        questionType,
        competencyId: competency.id,
        orderNumber: 1,
        questionText: questInput.question,
        instruction: questInput.instruction,
        status: QuestionStatus.ACTIVE,
      },
      create: {
        questId: quest.id,
        code: `${questInput.code}-Q1`,
        questionType,
        competencyId: competency.id,
        measurementCategory: "FOUNDATION",
        difficulty: "EASY",
        bloomLevel: "UNDERSTAND",
        orderNumber: 1,
        questionText: questInput.question,
        instruction: questInput.instruction,
        skillTags: [input.key, input.competency.code],
        masteryPoint: 1,
        xpReward: 20,
        estimatedTimeSeconds: 60,
        sampleAnswer: questInput.codeConfig?.expectedOutput,
        status: QuestionStatus.ACTIVE,
      },
    });

    if (
      questionType === QuestQuestionType.CODE_INPUT &&
      questInput.codeConfig
    ) {
      await prisma.questCodeConfig.upsert({
        where: { questQuestionId: question.id },
        update: questInput.codeConfig,
        create: {
          questQuestionId: question.id,
          ...questInput.codeConfig,
        },
      });
      continue;
    }

    for (const [optionIndex, option] of (questInput.options ?? []).entries()) {
      await prisma.questQuestionOption.upsert({
        where: {
          questQuestionId_optionId: {
            questQuestionId: question.id,
            optionId: option.id,
          },
        },
        update: {
          label: option.label,
          isCorrect: option.correct,
          displayOrder: optionIndex + 1,
        },
        create: {
          questQuestionId: question.id,
          optionId: option.id,
          label: option.label,
          isCorrect: option.correct,
          displayOrder: optionIndex + 1,
        },
      });
    }

    await prisma.quest.update({
      where: { id: quest.id },
      data: {
        hints: [
          `Misi ${index + 1}: baca konteksnya dulu.`,
          "Eliminasi jawaban yang tidak didukung soal.",
        ],
      },
    });
  }
}

async function main() {
  await upsertPlacementCodeInput();
  for (const world of worlds) {
    await seedWorld(world);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
