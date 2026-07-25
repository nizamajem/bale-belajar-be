import {
  ActivityType,
  CurriculumLessonType,
  CurriculumModuleStatus,
  EvidenceRelevance,
  EvidenceStrength,
  MissionStatus,
  PrismaClient,
  QuestionDifficulty,
  QuestionStatus,
  QuestionType,
  UserRole,
} from "@prisma/client";
import * as bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  const adminPasswordHash = await bcrypt.hash("Admin123!", 12);
  const teacherPasswordHash = await bcrypt.hash("Guru123!", 12);

  const school = await prisma.school.upsert({
    where: { slug: "sdn-1-mataram" },
    update: {},
    create: {
      name: "SDN 1 Mataram",
      slug: "sdn-1-mataram",
      npsn: "50200001",
      address: "Jl. Pendidikan No. 1",
      province: "Nusa Tenggara Barat",
      city: "Mataram",
      district: "Selaparang",
      contactName: "Ibu Sari",
      contactPhone: "6281234567890",
      contactEmail: "sdn1@example.sch.id",
      pilotStatus: "ACTIVE_PILOT",
    },
  });

  const admin = await prisma.user.upsert({
    where: { email: "admin@balebelajar.id" },
    update: {},
    create: {
      name: "Admin BaleBelajar",
      email: "admin@balebelajar.id",
      passwordHash: adminPasswordHash,
      role: UserRole.SUPER_ADMIN,
    },
  });

  const teacherUser = await prisma.user.upsert({
    where: { email: "guru@balebelajar.id" },
    update: {},
    create: {
      name: "Guru Demo",
      email: "guru@balebelajar.id",
      passwordHash: teacherPasswordHash,
      role: UserRole.TEACHER,
    },
  });

  const teacher = await prisma.teacherProfile.upsert({
    where: { userId: teacherUser.id },
    update: {},
    create: {
      userId: teacherUser.id,
      schoolId: school.id,
      employeeNumber: "G-001",
      subjectSpecialization: "Matematika",
    },
  });

  const demoStudentPasswordHash = await bcrypt.hash("Siswa123!", 12);
  // Akun demo ini sengaja dibuat multi-role (Siswa + Guru) supaya fitur
  // pindah peran bisa langsung dicoba tanpa perlu langkah tambahan.
  const demoStudentUser = await prisma.user.upsert({
    where: { email: "siswa@balebelajar.id" },
    update: { additionalRoles: [UserRole.TEACHER] },
    create: {
      name: "Siswa Demo Email",
      email: "siswa@balebelajar.id",
      passwordHash: demoStudentPasswordHash,
      role: UserRole.STUDENT,
      additionalRoles: [UserRole.TEACHER],
    },
  });

  await prisma.studentProfile.upsert({
    where: { userId: demoStudentUser.id },
    update: { schoolId: school.id },
    create: {
      userId: demoStudentUser.id,
      fullName: demoStudentUser.name,
      schoolId: school.id,
      gradeLevel: 10,
    },
  });

  await prisma.teacherProfile.upsert({
    where: { userId: demoStudentUser.id },
    update: {},
    create: {
      userId: demoStudentUser.id,
      schoolId: school.id,
      employeeNumber: "G-DEMO",
      subjectSpecialization: "Lintas Mapel",
    },
  });

  const classroom = await prisma.classroom.upsert({
    where: {
      schoolId_name_academicYear: {
        schoolId: school.id,
        name: "VI A",
        academicYear: "2026/2027",
      },
    },
    update: {},
    create: {
      schoolId: school.id,
      name: "VI A",
      gradeLevel: 6,
      academicYear: "2026/2027",
      homeroomTeacherId: teacher.id,
    },
  });

  for (let index = 1; index <= 30; index += 1) {
    const participantCode = `BB-S${String(index).padStart(3, "0")}`;
    const student = await prisma.studentProfile.upsert({
      where: { participantCode },
      update: {},
      create: {
        schoolId: school.id,
        participantCode,
        studentNumber: `S-${String(index).padStart(3, "0")}`,
        fullName: `Siswa Demo ${index}`,
        academicYear: "2026/2027",
      },
    });

    await prisma.classroomStudent.upsert({
      where: {
        classroomId_studentId: {
          classroomId: classroom.id,
          studentId: student.id,
        },
      },
      update: {},
      create: {
        classroomId: classroom.id,
        studentId: student.id,
      },
    });
  }

  const subject = await prisma.subject.upsert({
    where: { code: "MTK" },
    update: {},
    create: {
      code: "MTK",
      name: "Matematika",
      description: "Mata pelajaran Matematika untuk asesmen diagnostik.",
    },
  });

  const competencyInputs = [
    ["MTK-6-BIL", "Bilangan", "Operasi dan konsep bilangan"],
    ["MTK-6-PEC", "Pecahan", "Operasi pecahan dan desimal"],
    ["MTK-6-PER", "Perbandingan", "Perbandingan senilai dan berbalik nilai"],
    ["MTK-6-DAT", "Pengolahan Data", "Membaca dan menafsirkan data"],
    ["MTK-6-BDG", "Bangun Datar", "Keliling dan luas bangun datar"],
  ];

  const competencies = [];
  for (const [index, [code, name, description]] of competencyInputs.entries()) {
    const competency = await prisma.competency.upsert({
      where: {
        subjectId_code: {
          subjectId: subject.id,
          code,
        },
      },
      update: {},
      create: {
        subjectId: subject.id,
        code,
        name,
        description,
        gradeLevel: 6,
        orderNumber: index + 1,
      },
    });

    competencies.push(competency);

    for (let subIndex = 1; subIndex <= 2; subIndex += 1) {
      await prisma.subCompetency.upsert({
        where: {
          competencyId_code: {
            competencyId: competency.id,
            code: `${code}-${subIndex}`,
          },
        },
        update: {},
        create: {
          competencyId: competency.id,
          code: `${code}-${subIndex}`,
          name: `${name} ${subIndex}`,
          description: `Subkompetensi ${name.toLowerCase()} ${subIndex}.`,
          orderNumber: subIndex,
        },
      });
    }
  }

  await prisma.competencyPrerequisite.upsert({
    where: {
      competencyId_prerequisiteCompetencyId: {
        competencyId: competencies[2].id,
        prerequisiteCompetencyId: competencies[1].id,
      },
    },
    update: {},
    create: {
      competencyId: competencies[2].id,
      prerequisiteCompetencyId: competencies[1].id,
    },
  });

  const subCompetencies = await prisma.subCompetency.findMany({
    where: {
      competencyId: {
        in: competencies.map((competency) => competency.id),
      },
    },
    orderBy: [{ competencyId: "asc" }, { orderNumber: "asc" }],
  });

  for (let index = 1; index <= 30; index += 1) {
    const competency = competencies[(index - 1) % competencies.length];
    const subCompetency =
      subCompetencies.find((item) => item.competencyId === competency.id) ??
      null;
    const code = `MTK-DEMO-${String(index).padStart(3, "0")}`;

    await prisma.question.upsert({
      where: { code },
      update: {},
      create: {
        code,
        subjectId: subject.id,
        competencyId: competency.id,
        subCompetencyId: subCompetency?.id,
        gradeLevel: 6,
        difficulty:
          index % 3 === 0
            ? QuestionDifficulty.HARD
            : index % 2 === 0
              ? QuestionDifficulty.MEDIUM
              : QuestionDifficulty.EASY,
        type: QuestionType.MULTIPLE_CHOICE,
        questionText: `Soal demo ${index}: pilih jawaban yang paling tepat untuk kompetensi ${competency.name}.`,
        explanation: `Pembahasan demo untuk soal ${index}.`,
        weight: 1,
        source: "seed",
        status: QuestionStatus.ACTIVE,
        createdBy: admin.id,
        options: {
          create: [
            {
              optionKey: "A",
              optionText: "Jawaban A",
              isCorrect: true,
              orderNumber: 1,
            },
            {
              optionKey: "B",
              optionText: "Jawaban B",
              isCorrect: false,
              orderNumber: 2,
            },
            {
              optionKey: "C",
              optionText: "Jawaban C",
              isCorrect: false,
              orderNumber: 3,
            },
            {
              optionKey: "D",
              optionText: "Jawaban D",
              isCorrect: false,
              orderNumber: 4,
            },
          ],
        },
      },
    });
  }

  const assessment = await prisma.assessment.upsert({
    where: {
      subjectId_slug: {
        subjectId: subject.id,
        slug: "diagnostik-matematika-vi",
      },
    },
    update: {},
    create: {
      schoolId: school.id,
      subjectId: subject.id,
      title: "Diagnostik Matematika VI",
      slug: "diagnostik-matematika-vi",
      description: "Asesmen diagnostik demo untuk kelas VI.",
      gradeLevel: 6,
      durationMinutes: 30,
      showResultImmediately: true,
      allowRetake: false,
      maxAttempts: 1,
      status: "DRAFT",
      createdBy: admin.id,
    },
  });

  const demoQuestions = await prisma.question.findMany({
    where: {
      subjectId: subject.id,
      status: QuestionStatus.ACTIVE,
    },
    orderBy: { code: "asc" },
    take: 10,
  });

  for (const [index, question] of demoQuestions.entries()) {
    await prisma.assessmentQuestion.upsert({
      where: {
        assessmentId_questionId: {
          assessmentId: assessment.id,
          questionId: question.id,
        },
      },
      update: {},
      create: {
        assessmentId: assessment.id,
        questionId: question.id,
        orderNumber: index + 1,
      },
    });
  }

  await prisma.assessmentClassroom.upsert({
    where: {
      assessmentId_classroomId: {
        assessmentId: assessment.id,
        classroomId: classroom.id,
      },
    },
    update: {},
    create: {
      assessmentId: assessment.id,
      classroomId: classroom.id,
    },
  });

  // create() biasa (bukan upsert) - dijaga findFirst supaya seed tetap aman
  // dijalankan berkali-kali (mis. tiap kali container production restart).
  const existingLead = await prisma.schoolLead.findFirst({
    where: { email: "pilot@example.sch.id" },
  });
  if (!existingLead) {
    await prisma.schoolLead.create({
      data: {
        schoolName: "SMP Tunas Ilmu",
        contactName: "Pak Ahmad",
        position: "Wakil Kurikulum",
        phone: "628111111111",
        email: "pilot@example.sch.id",
        studentCount: 280,
        message: "Ingin mencoba pilot kelas VII.",
        source: "seed",
      },
    });
  }

  const existingSeedLog = await prisma.auditLog.findFirst({
    where: { action: "SEED_DATABASE", entity: "Database" },
  });
  if (!existingSeedLog) {
    await prisma.auditLog.create({
      data: {
        userId: admin.id,
        action: "SEED_DATABASE",
        entity: "Database",
        newData: {
          school: school.slug,
          classroom: classroom.name,
          students: 30,
        },
      },
    });
  }

  await seedBaleVerse(subject.id);
  await seedBaleDetective();
}

async function seedBaleVerse(mtkSubjectId: string) {
  const world = await prisma.world.upsert({
    where: { key: "numeria" },
    update: {},
    create: {
      subjectId: mtkSubjectId,
      key: "numeria",
      name: "Numeria",
      characterClass: "Arsitek Logika",
      themeDescription:
        "Dunia Matematika: Desa Angka, Gerbang Aljabar, Hutan Fungsi, Menara Grafik.",
      orderNumber: 1,
    },
  });

  const persamaanLinear = await prisma.competency.upsert({
    where: {
      subjectId_code: { subjectId: mtkSubjectId, code: "MTK-10-PLDV" },
    },
    update: {},
    create: {
      subjectId: mtkSubjectId,
      code: "MTK-10-PLDV",
      name: "Persamaan Linear",
      description: "Persamaan dan pertidaksamaan linear satu/dua variabel.",
      gradeLevel: 10,
      orderNumber: 100,
    },
  });

  const fungsi = await prisma.competency.upsert({
    where: {
      subjectId_code: { subjectId: mtkSubjectId, code: "MTK-10-FUNGSI" },
    },
    update: {},
    create: {
      subjectId: mtkSubjectId,
      code: "MTK-10-FUNGSI",
      name: "Fungsi",
      description: "Konsep fungsi, domain, kodomain, dan grafik fungsi.",
      gradeLevel: 10,
      orderNumber: 101,
    },
  });

  await prisma.competencyPrerequisite.upsert({
    where: {
      competencyId_prerequisiteCompetencyId: {
        competencyId: fungsi.id,
        prerequisiteCompetencyId: persamaanLinear.id,
      },
    },
    update: {},
    create: {
      competencyId: fungsi.id,
      prerequisiteCompetencyId: persamaanLinear.id,
    },
  });

  const mission = await prisma.mission.upsert({
    where: { id: "00000000-0000-0000-0000-000000000001" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000001",
      worldId: world.id,
      competencyId: persamaanLinear.id,
      title: "Perbaiki Jembatan Persamaan",
      narrativeTemplate:
        "Jembatan menuju Gerbang Aljabar retak! Bantu perbaiki dengan menyelesaikan persamaan linear di setiap papan jembatan.",
      estimatedMinutes: 12,
      status: MissionStatus.ACTIVE,
    },
  });

  const activityInputs = [
    {
      orderNumber: 1,
      prompt: "Berapakah nilai x pada persamaan 2x + 4 = 12?",
      explanation: "2x + 4 = 12 -> 2x = 8 -> x = 4.",
      options: [
        { optionKey: "A", optionText: "2", isCorrect: false },
        { optionKey: "B", optionText: "4", isCorrect: true },
        { optionKey: "C", optionText: "6", isCorrect: false },
        { optionKey: "D", optionText: "8", isCorrect: false },
      ],
    },
    {
      orderNumber: 2,
      prompt: "Berapakah nilai x pada persamaan 3x - 5 = 10?",
      explanation: "3x - 5 = 10 -> 3x = 15 -> x = 5.",
      options: [
        { optionKey: "A", optionText: "3", isCorrect: false },
        { optionKey: "B", optionText: "4", isCorrect: false },
        { optionKey: "C", optionText: "5", isCorrect: true },
        { optionKey: "D", optionText: "6", isCorrect: false },
      ],
    },
    {
      orderNumber: 3,
      prompt: "Manakah bentuk yang setara dengan 5x + 10 = 0?",
      explanation: "5x + 10 = 0 -> 5x = -10 -> x = -2, sehingga x + 2 = 0.",
      options: [
        { optionKey: "A", optionText: "x + 2 = 0", isCorrect: true },
        { optionKey: "B", optionText: "x - 2 = 0", isCorrect: false },
        { optionKey: "C", optionText: "x + 10 = 0", isCorrect: false },
        { optionKey: "D", optionText: "5x = 10", isCorrect: false },
      ],
    },
  ];

  for (const activityInput of activityInputs) {
    const activity = await prisma.activity.upsert({
      where: {
        missionId_orderNumber: {
          missionId: mission.id,
          orderNumber: activityInput.orderNumber,
        },
      },
      update: {},
      create: {
        missionId: mission.id,
        orderNumber: activityInput.orderNumber,
        prompt: activityInput.prompt,
        type: ActivityType.MULTIPLE_CHOICE,
        explanation: activityInput.explanation,
      },
    });

    for (const [index, option] of activityInput.options.entries()) {
      await prisma.activityOption.upsert({
        where: {
          activityId_optionKey: {
            activityId: activity.id,
            optionKey: option.optionKey,
          },
        },
        update: {},
        create: {
          activityId: activity.id,
          optionKey: option.optionKey,
          optionText: option.optionText,
          isCorrect: option.isCorrect,
          orderNumber: index + 1,
        },
      });
    }
  }
}

async function seedBaleDetective() {
  const subject = await prisma.subject.upsert({
    where: { code: "DETEKTIF" },
    update: {},
    create: {
      code: "DETEKTIF",
      name: "Deteksi & Logika",
      description:
        "Observasi, penalaran, memori, kronologi, evaluasi sumber, dan komunikasi lewat investigasi kasus fiktif.",
    },
  });

  const skillInputs = [
    ["DET-OBSERVASI", "Observasi", "Menemukan dan mendeskripsikan detail secara teliti"],
    ["DET-PENALARAN", "Penalaran Logis", "Menarik kesimpulan berdasarkan bukti, bukan prasangka"],
    ["DET-MEMORI", "Memori Kerja", "Mengingat dan mengolah informasi secara akurat"],
    ["DET-KRONOLOGI", "Analisis Kronologi", "Menyusun urutan kejadian dan menemukan ketidaksesuaian waktu"],
    ["DET-SUMBER", "Evaluasi Sumber", "Membedakan sumber informasi yang kuat dan lemah"],
    ["DET-ETIKA", "Komunikasi dan Etika", "Bertanya secara netral dan mengambil keputusan bertanggung jawab"],
  ];

  const skills: Record<string, Awaited<ReturnType<typeof prisma.competency.upsert>>> = {};
  for (const [index, [code, name, description]] of skillInputs.entries()) {
    skills[code] = await prisma.competency.upsert({
      where: { subjectId_code: { subjectId: subject.id, code } },
      update: {},
      create: {
        subjectId: subject.id,
        code,
        name,
        description,
        orderNumber: index + 1,
      },
    });
  }

  const world = await prisma.world.upsert({
    where: { key: "detectivia" },
    update: {},
    create: {
      subjectId: subject.id,
      key: "detectivia",
      name: "Detectivia",
      characterClass: "Bale Sleuth",
      themeDescription:
        "Dunia investigasi: Kamp Observasi, Lorong Ingatan, Jembatan Logika, Kota Kronologi, Ruang Wawancara, Perpustakaan Sumber.",
      orderNumber: 2,
    },
  });

  const detectiveModule = await prisma.curriculumModule.upsert({
    where: { worldId_slug: { worldId: world.id, slug: "observasi-bukti-dasar" } },
    update: {
      competencyId: skills["DET-OBSERVASI"].id,
      title: "Modul 1: Observasi Bukti Seperti Detektif",
      simpleGoal:
        "Kamu belajar membaca kasus dari dasar: menemukan fakta, memisahkan asumsi, mengecek sumber, lalu membuat kesimpulan yang adil.",
      bigIdea:
        "Detektif profesional tidak mulai dari menuduh. Mereka mulai dari pertanyaan: apa yang benar-benar kita tahu, dari mana kita tahu, dan bukti apa yang masih kurang?",
      status: CurriculumModuleStatus.ACTIVE,
    },
    create: {
      worldId: world.id,
      competencyId: skills["DET-OBSERVASI"].id,
      slug: "observasi-bukti-dasar",
      title: "Modul 1: Observasi Bukti Seperti Detektif",
      simpleGoal:
        "Kamu belajar membaca kasus dari dasar: menemukan fakta, memisahkan asumsi, mengecek sumber, lalu membuat kesimpulan yang adil.",
      bigIdea:
        "Detektif profesional tidak mulai dari menuduh. Mereka mulai dari pertanyaan: apa yang benar-benar kita tahu, dari mana kita tahu, dan bukti apa yang masih kurang?",
      orderNumber: 1,
      estimatedMinutes: 25,
      status: CurriculumModuleStatus.ACTIVE,
    },
  });

  const lessonInputs = [
    {
      type: CurriculumLessonType.CONCEPT,
      title: "Fakta",
      body: "Fakta adalah informasi yang bisa dicek. Contoh: jadwal ruangan, catatan login, waktu file disimpan, isi pesan, atau rekaman kamera.",
      examples: [
        "Catatan login komputer: Budi login pukul 13.32. Ini fakta karena berasal dari sistem dan waktunya jelas.",
      ],
      items: [],
    },
    {
      type: CurriculumLessonType.CONCEPT,
      title: "Asumsi",
      body: "Asumsi adalah dugaan yang belum cukup bukti. Asumsi boleh dicatat sebagai kemungkinan, tetapi belum boleh dipakai untuk menuduh.",
      examples: [
        "Meja berantakan berarti pelakunya panik. Ini masih asumsi karena meja berantakan bisa terjadi karena banyak sebab.",
      ],
      items: [],
    },
    {
      type: CurriculumLessonType.CONCEPT,
      title: "Pengecoh",
      body: "Pengecoh adalah detail yang terlihat menarik, tetapi tidak langsung membantu menjawab pertanyaan utama.",
      examples: [
        "Warna tas seseorang mungkin terlihat mencolok, tetapi tidak relevan jika kasusnya tentang waktu file terakhir disimpan.",
      ],
      items: [],
    },
    {
      type: CurriculumLessonType.CONCEPT,
      title: "Sumber kuat dan sumber lemah",
      body: "Sumber kuat biasanya otomatis, tercatat, atau bisa diverifikasi. Sumber lemah biasanya hanya ingatan, kesan, atau cerita satu orang.",
      examples: [
        "Log komputer lebih kuat daripada pernyataan 'seingatku dia lama di ruangan', karena log punya waktu yang spesifik.",
      ],
      items: [],
    },
    {
      type: CurriculumLessonType.CONCEPT,
      title: "Kronologi",
      body: "Kronologi adalah urutan kejadian. Detektif menyusun waktu untuk melihat siapa yang punya kesempatan, apa yang berubah, dan bagian mana yang belum jelas.",
      examples: [
        "Jika file masih ada pukul 15.20 tetapi hilang pukul 15.45, maka fokus investigasi berada di rentang 15.20-15.45.",
      ],
      items: [],
    },
    {
      type: CurriculumLessonType.CONCEPT,
      title: "Kesimpulan sementara",
      body: "Kesimpulan sementara harus menyebut bukti pendukung dan bagian yang belum pasti. Detektif yang baik berani berkata 'bukti belum cukup'.",
      examples: [
        "Kesimpulan aman: file kemungkinan berubah setelah pukul 15.20, tetapi belum cukup bukti untuk menuduh satu orang.",
      ],
      items: [],
    },
    {
      type: CurriculumLessonType.PROFESSIONAL_HABIT,
      title: "Kebiasaan detektif profesional",
      body: "Kebiasaan ini dipakai setiap kali kamu membaca kasus.",
      examples: [],
      items: [
        "Tulis bukti apa adanya sebelum membuat dugaan.",
        "Pisahkan fakta, asumsi, dan pertanyaan yang belum terjawab.",
        "Cari lebih dari satu sumber sebelum percaya pada kesimpulan.",
        "Jangan menuduh orang jika bukti belum cukup.",
        "Saat menjawab, gunakan pola: bukti -> alasan -> kesimpulan.",
      ],
    },
    {
      type: CurriculumLessonType.EXAMPLE,
      title: "Contoh jawaban lengkap",
      body: "Bukti terkuat adalah riwayat file pukul 15.20 dan waktu pengecekan pukul 15.45. Dedi memang berada di ruangan pada rentang itu, tetapi itu belum cukup untuk menuduh. Kemungkinan yang perlu dicek: file dipindahkan, berubah nama, terhapus tidak sengaja, atau disimpan di folder lain.",
      examples: [
        "Rumus jawaban: Bukti yang kupakai adalah ... Maka kemungkinan ... Namun belum pasti karena ... Jadi langkah berikutnya ...",
        "Hindari: Dedi pasti pelakunya karena dia orang terakhir di ruangan.",
      ],
      items: [],
    },
    {
      type: CurriculumLessonType.CHECKLIST,
      title: "Checklist sebelum tes",
      body: "Gunakan checklist ini sebelum menulis kesimpulan.",
      examples: [],
      items: [
        "Apa pertanyaan utama kasus ini?",
        "Bukti mana yang paling kuat?",
        "Bukti mana yang hanya sebagian membantu?",
        "Detail mana yang mungkin pengecoh?",
        "Apa minimal dua kemungkinan penjelasan?",
        "Bukti apa yang masih perlu dicari?",
        "Apakah kesimpulanku sudah adil dan tidak menuduh tanpa dasar?",
      ],
    },
    {
      type: CurriculumLessonType.RUBRIC,
      title: "Jawabanmu dinilai dari",
      body: "Rubrik ini membuat tes terasa adil dan jelas.",
      examples: [],
      items: [
        "Jawaban menyebut bukti spesifik.",
        "Jawaban membedakan fakta dan asumsi.",
        "Jawaban memberi alasan, bukan hanya kesimpulan.",
        "Jawaban menyebut informasi yang masih perlu diverifikasi.",
        "Jawaban tidak menuduh tanpa bukti kuat.",
      ],
    },
    {
      type: CurriculumLessonType.MASTERY_PATH,
      title: "Jalur mastery berikutnya",
      body: "Setelah observasi bukti, kamu akan naik ke kemampuan detektif yang lebih sulit.",
      examples: [],
      items: [
        "Kronologi kejadian",
        "Logika hipotesis",
        "Wawancara saksi",
        "Verifikasi sumber",
        "Etika laporan investigasi",
        "Kasus besar lintas bukti",
      ],
    },
  ];

  for (const [index, lesson] of lessonInputs.entries()) {
    await prisma.curriculumLesson.upsert({
      where: {
        moduleId_orderNumber: {
          moduleId: detectiveModule.id,
          orderNumber: index + 1,
        },
      },
      update: lesson,
      create: {
        moduleId: detectiveModule.id,
        orderNumber: index + 1,
        ...lesson,
      },
    });
  }

  const caseStudyInputs = [
    {
      title: "Studi Kasus A: Kunci kelas hilang",
      story:
        "Pukul 07.10 kamera mencatat pintu kelas terbuka. Pukul 07.20 wali kelas masuk dan kunci cadangan tidak ada. Satu siswa melihat meja guru berantakan, tetapi tidak melihat siapa pun mengambil kunci.",
      analysisSteps: [
        "Fakta kuat: kamera mencatat pintu terbuka pukul 07.10.",
        "Fakta kuat: kunci belum ada saat wali kelas masuk pukul 07.20.",
        "Petunjuk lemah: meja berantakan, karena belum jelas penyebabnya.",
        "Kesimpulan aman: kejadian kemungkinan terjadi antara 07.10-07.20, tetapi pelaku belum bisa ditentukan.",
      ],
      commonMistake:
        "Langsung menuduh siswa yang pertama datang. Itu belum adil karena belum ada bukti dia mengambil kunci.",
    },
    {
      title: "Studi Kasus B: File presentasi hilang",
      story:
        "Empat siswa memakai komputer bersama. Log menunjukkan file terakhir disimpan pukul 15.20. Pukul 15.45 file tidak ditemukan. Salah satu siswa menulis di grup bahwa file terlihat aneh dan ia menyimpan ulang pukul 14.30.",
      analysisSteps: [
        "Fakta kuat: file masih tercatat disimpan pukul 15.20.",
        "Fakta kuat: file tidak ditemukan pukul 15.45.",
        "Petunjuk sedang: pesan grup pukul 14.30 menunjukkan ada masalah file sebelumnya.",
        "Pertanyaan lanjutan: apakah file terhapus, dipindahkan folder, atau berubah nama setelah 15.20?",
      ],
      commonMistake:
        "Menganggap siswa yang menulis pesan pukul 14.30 pasti pelakunya. Padahal file masih tersimpan pukul 15.20.",
    },
    {
      title: "Studi Kasus C: Botol minum tertukar",
      story:
        "Dua botol minum mirip tertinggal di lapangan. Satu botol punya stiker kecil, satu lagi tidak. Tiga siswa mengaku membawa botol warna sama, tetapi hanya satu yang menyebut ada stiker.",
      analysisSteps: [
        "Fakta pembeda: stiker kecil di salah satu botol.",
        "Sumber yang perlu dicek: pernyataan siswa dan ciri fisik botol.",
        "Kesimpulan aman: pemilik paling mungkin adalah siswa yang bisa menyebut ciri unik, tetapi tetap perlu konfirmasi.",
      ],
      commonMistake:
        "Memilih pemilik hanya dari warna botol. Warna saja lemah karena ada lebih dari satu botol yang mirip.",
    },
  ];

  for (const [index, caseStudy] of caseStudyInputs.entries()) {
    await prisma.curriculumCaseStudy.upsert({
      where: {
        moduleId_orderNumber: {
          moduleId: detectiveModule.id,
          orderNumber: index + 1,
        },
      },
      update: caseStudy,
      create: {
        moduleId: detectiveModule.id,
        orderNumber: index + 1,
        ...caseStudy,
      },
    });
  }

  await prisma.remedialRule.upsert({
    where: { id: "00000000-0000-0000-0000-000000000101" },
    update: {
      moduleId: detectiveModule.id,
      competencyId: skills["DET-OBSERVASI"].id,
      recommendationTitle:
        "Belajar ulang singkat, lalu tes berikutnya akan mengulang skill yang lemah.",
      recommendationMessage:
        "Kamu tidak perlu mengulang kasus yang sama. Sistem akan memberi kasus baru dengan pola mirip agar kamu benar-benar paham, bukan menghafal jawaban.",
    },
    create: {
      id: "00000000-0000-0000-0000-000000000101",
      moduleId: detectiveModule.id,
      competencyId: skills["DET-OBSERVASI"].id,
      minScoreExclusive: 60,
      recommendationTitle:
        "Belajar ulang singkat, lalu tes berikutnya akan mengulang skill yang lemah.",
      recommendationMessage:
        "Kamu tidak perlu mengulang kasus yang sama. Sistem akan memberi kasus baru dengan pola mirip agar kamu benar-benar paham, bukan menghafal jawaban.",
    },
  });

  const caseMission = await prisma.caseMission.upsert({
    where: { id: "00000000-0000-0000-0000-000000000002" },
    update: { curriculumModuleId: detectiveModule.id },
    create: {
      id: "00000000-0000-0000-0000-000000000002",
      worldId: world.id,
      curriculumModuleId: detectiveModule.id,
      title: "Misteri Dokumen Presentasi",
      openingStory:
        "Setelah kegiatan sekolah, file presentasi tim tidak ditemukan di komputer bersama. Empat orang menggunakan ruangan pada waktu berbeda. Kamu ditugaskan menyelidiki apa yang sebenarnya terjadi - tanpa langsung menuduh siapa pun.",
      estimatedMinutes: 20,
      status: MissionStatus.ACTIVE,
    },
  });

  const evidenceInputs = [
    {
      type: "DOCUMENT",
      content: "Jadwal penggunaan ruangan: Ani 13.00-13.30, Budi 13.30-14.15, Citra 14.15-15.00, Dedi 15.00-15.45.",
      relevance: EvidenceRelevance.RELEVANT,
      sourceStrength: EvidenceStrength.HIGH,
    },
    {
      type: "LOG",
      content: "Catatan login komputer bersama: Ani login 13.05, Budi login 13.32, Citra login 14.20, Dedi login 15.02.",
      relevance: EvidenceRelevance.RELEVANT,
      sourceStrength: EvidenceStrength.HIGH,
    },
    {
      type: "STATEMENT",
      content: "Pernyataan keempat anggota: semua mengaku sempat membuka file presentasi untuk menambahkan bagian masing-masing.",
      relevance: EvidenceRelevance.RELEVANT,
      sourceStrength: EvidenceStrength.MEDIUM,
    },
    {
      type: "LOG",
      content: "Riwayat perubahan file menunjukkan file terakhir disimpan pukul 15.20, lalu tidak ditemukan lagi pukul 15.45.",
      relevance: EvidenceRelevance.RELEVANT,
      sourceStrength: EvidenceStrength.HIGH,
    },
    {
      type: "PHOTO_DESC",
      content: "Foto ruangan menunjukkan susunan meja sedikit berubah dari foto pagi hari, kursi Dedi tergeser ke arah pintu.",
      relevance: EvidenceRelevance.PARTIAL,
      sourceStrength: EvidenceStrength.LOW,
    },
    {
      type: "MESSAGE",
      content: "Pesan grup simulasi: Citra sempat menulis 'file-nya aneh, aku save ulang ya' sekitar pukul 14.30.",
      relevance: EvidenceRelevance.PARTIAL,
      sourceStrength: EvidenceStrength.MEDIUM,
    },
  ];

  for (const [index, evidence] of evidenceInputs.entries()) {
    await prisma.caseEvidence.upsert({
      where: {
        caseMissionId_orderNumber: {
          caseMissionId: caseMission.id,
          orderNumber: index + 1,
        },
      },
      update: {},
      create: {
        caseMissionId: caseMission.id,
        orderNumber: index + 1,
        ...evidence,
      },
    });
  }

  const questionInputs = [
    {
      skill: "DET-SUMBER",
      prompt: "Fakta apa yang sudah dapat diverifikasi dari bukti-bukti di atas?",
      expectedKeywords: ["jadwal", "login", "waktu", "perubahan", "15.20", "catatan"],
      expectedReasoning:
        "Fakta yang terverifikasi adalah yang didukung lebih dari satu sumber independen - misalnya jadwal penggunaan ruangan dan catatan login yang sama-sama menunjukkan urutan pemakaian, serta riwayat perubahan file pukul 15.20.",
    },
    {
      skill: "DET-PENALARAN",
      prompt: "Buat minimal dua hipotesis berbeda tentang apa yang terjadi pada file tersebut.",
      expectedKeywords: ["terhapus", "dipindahkan", "sengaja", "tidak sengaja", "folder", "tersimpan"],
      expectedReasoning:
        "Hipotesis yang masuk akal misalnya: (1) file dipindahkan atau tersimpan ke folder lain tanpa sengaja saat Citra menyimpan ulang, (2) file terhapus tidak sengaja setelah pukul 15.20.",
    },
    {
      skill: "DET-KRONOLOGI",
      prompt: "Susun kronologi penggunaan ruangan berdasarkan bukti yang ada. Adakah bagian yang tidak masuk akal?",
      expectedKeywords: ["urutan", "sebelum", "sesudah", "tumpang tindih", "jadwal", "login"],
      expectedReasoning:
        "Kronologi disusun dari jadwal dan catatan login. Periksa apakah waktu login setiap orang konsisten dengan jadwal ruangan, atau ada tumpang tindih yang perlu diklarifikasi.",
    },
    {
      skill: "DET-ETIKA",
      prompt: "Apakah bukti yang ada sudah cukup untuk menuduh salah satu dari empat orang tersebut? Jelaskan alasanmu.",
      expectedKeywords: ["belum cukup", "tidak boleh menuduh", "informasi tambahan", "tidak adil", "praduga"],
      expectedReasoning:
        "Belum cukup bukti untuk menuduh siapa pun secara spesifik. Menuduh tanpa bukti kuat dapat merugikan orang yang tidak bersalah - sikap etis detektif adalah menahan kesimpulan sampai bukti benar-benar cukup.",
    },
  ] as const;

  for (const [index, question] of questionInputs.entries()) {
    await prisma.caseQuestion.upsert({
      where: {
        caseMissionId_orderNumber: {
          caseMissionId: caseMission.id,
          orderNumber: index + 1,
        },
      },
      update: {},
      create: {
        caseMissionId: caseMission.id,
        competencyId: skills[question.skill].id,
        orderNumber: index + 1,
        prompt: question.prompt,
        expectedKeywords: [...question.expectedKeywords],
        expectedReasoning: question.expectedReasoning,
      },
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
