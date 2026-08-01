import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../database/prisma/prisma.service";
import { SaveOnboardingDto } from "../student-onboarding/dto/save-onboarding.dto";
import { SavePlacementAnswerDto } from "../student-placement/dto/save-placement-answer.dto";

const TOTAL_PLACEMENT_QUESTIONS = 13;

@Injectable()
export class StudentPrototypeService {
  constructor(private readonly prisma: PrismaService) {}

  async startSession() {
    const student = await this.prisma.studentProfile.create({
      data: {
        fullName: "Nara",
        gradeLevel: 10,
      },
    });

    return {
      studentProfileId: student.id,
      displayName: student.fullName,
      nextRoute: "ONBOARDING",
    };
  }

  async saveOnboarding(studentProfileId: string, dto: SaveOnboardingDto) {
    await this.assertStudent(studentProfileId);
    return this.prisma.studentOnboarding.upsert({
      where: { studentProfileId },
      create: {
        studentProfileId,
        ...this.toOnboardingData(dto),
      },
      update: this.toOnboardingData(dto),
    });
  }

  async completeOnboarding(studentProfileId: string, dto: SaveOnboardingDto) {
    await this.assertStudent(studentProfileId);
    const onboarding = await this.prisma.studentOnboarding.upsert({
      where: { studentProfileId },
      create: {
        studentProfileId,
        ...this.toOnboardingData(dto),
        completedAt: new Date(),
      },
      update: {
        ...this.toOnboardingData(dto),
        completedAt: new Date(),
      },
    });

    return { onboarding, nextRoute: "PLACEMENT_TEST" };
  }

  async startPlacement(studentProfileId: string, worldKey?: string) {
    await this.assertStudent(studentProfileId);
    const attempt = await this.prisma.placementAttempt.create({
      data: {
        studentProfileId,
        worldKey,
        totalQuestions: TOTAL_PLACEMENT_QUESTIONS,
      },
    });

    return { attemptId: attempt.id, totalQuestions: TOTAL_PLACEMENT_QUESTIONS };
  }

  async getPlacementQuestions(studentProfileId: string) {
    await this.assertStudent(studentProfileId);
    return {
      totalQuestions: TOTAL_PLACEMENT_QUESTIONS,
      questions: this.placementQuestions(),
    };
  }

  async getBaleVerse(studentProfileId: string) {
    const student = await this.prisma.studentProfile.findUnique({
      where: { id: studentProfileId },
      include: {
        onboarding: true,
        placementAttempts: {
          include: { analysis: true },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });
    if (!student) throw new NotFoundException("Sesi siswa tidak ditemukan.");

    const analysis = student.placementAttempts[0]?.analysis;
    const selectedWorld =
      analysis?.selectedWorld ?? student.onboarding?.learningWorld ?? "DETECTIVIA";

    return {
      profile: {
        name: student.fullName,
        rank: "Tunas II",
        level: student.gradeLevel ?? 10,
        foundation: analysis?.recommendedLevel ?? "FOUNDATION_3",
      },
      stats: {
        xp: 240,
        streak: 3,
        weeklyCompleted: 2,
        weeklyTarget: 3,
      },
      selectedWorld,
      todayMission: analysis?.firstMission ?? this.firstMission(selectedWorld),
      worlds: [
        {
          key: "NUMERIA",
          name: "Numeria",
          subject: "Matematika",
          description: "Latih matematika lewat teka-teki ringan.",
          exampleMission: "Pecahkan pola angka.",
          mastery: selectedWorld === "NUMERIA" ? 42 : 12,
          unlocked: true,
        },
        {
          key: "KODEX",
          name: "KodeX",
          subject: "Informatika",
          description: "Belajar logika komputer tanpa terasa berat.",
          exampleMission: "Susun langkah algoritma.",
          mastery: selectedWorld === "KODEX" ? 42 : 8,
          unlocked: true,
        },
        {
          key: "DETECTIVIA",
          name: "Detectivia",
          subject: "Observasi dan Analisis Bukti",
          description: "Amati petunjuk dan pecahkan kasus.",
          exampleMission: "Cari bukti yang paling kuat.",
          mastery: selectedWorld === "DETECTIVIA" ? 42 : 10,
          unlocked: true,
        },
      ],
      missions: [
        {
          id: "active-mission",
          title: "Gerbang Distribusi",
          description: "Memahami cara mendistribusikan angka ke semua bagian.",
          durationMinutes: 8,
          rewardXp: 90,
          active: true,
        },
        {
          id: "observation-practice",
          title: "Latihan Observasi",
          description: "Kenali petunjuk penting dari gambar.",
          durationMinutes: 6,
          rewardXp: 40,
          active: false,
        },
      ],
      learningPath: [
        { step: 1, title: "Pengenalan", completed: true, stars: 3 },
        { step: 2, title: "Detectivia", active: true, stars: 1 },
        { step: 3, title: "Sumber Daya", locked: true, stars: 0 },
      ],
    };
  }

  async savePlacementAnswer(
    attemptId: string,
    questionId: string,
    dto: SavePlacementAnswerDto,
  ) {
    await this.assertAttempt(attemptId);
    return this.prisma.placementAnswer.upsert({
      where: { attemptId_questionId: { attemptId, questionId } },
      create: {
        attemptId,
        questionId,
        questionType: dto.questionType,
        answer: dto.answer as Prisma.InputJsonValue,
        isSkipped: dto.isSkipped ?? false,
        clientAnsweredAt: dto.clientAnsweredAt
          ? new Date(dto.clientAnsweredAt)
          : undefined,
      },
      update: {
        questionType: dto.questionType,
        answer: dto.answer as Prisma.InputJsonValue,
        isSkipped: dto.isSkipped ?? false,
        clientAnsweredAt: dto.clientAnsweredAt
          ? new Date(dto.clientAnsweredAt)
          : undefined,
      },
    });
  }

  async skipPlacementAnswer(
    attemptId: string,
    questionId: string,
    questionType = "UNKNOWN",
  ) {
    return this.savePlacementAnswer(attemptId, questionId, {
      questionType,
      isSkipped: true,
      answer: { skipped: true },
      clientAnsweredAt: new Date().toISOString(),
    });
  }

  async submitPlacement(attemptId: string) {
    await this.assertAttempt(attemptId);
    await this.prisma.placementAttempt.update({
      where: { id: attemptId },
      data: { status: "SUBMITTED", submittedAt: new Date() },
    });

    return this.analyze(attemptId);
  }

  async analyze(attemptId: string) {
    const attempt = await this.prisma.placementAttempt.findUnique({
      where: { id: attemptId },
      include: { answers: true },
    });
    if (!attempt) throw new NotFoundException("Attempt tidak ditemukan.");

    const answered = attempt.answers.filter((answer) => !answer.isSkipped);
    const skipped = attempt.answers.length - answered.length;
    const completionRatio = answered.length / TOTAL_PLACEMENT_QUESTIONS;
    const selectedWorld = attempt.worldKey ?? "DETECTIVIA";
    const recommendedLevel =
      completionRatio >= 0.75
        ? "FOUNDATION_3"
        : completionRatio >= 0.45
          ? "FOUNDATION_2"
          : "FOUNDATION_1";

    return this.prisma.placementAnalysisResult.upsert({
      where: { attemptId },
      create: {
        attemptId,
        recommendedLevel,
        selectedWorld,
        strengths: ["PATTERN_RECOGNITION", "IMAGE_REASONING", "ORDERING"],
        focusAreas: ["EXPLAIN_REASONING", "VERIFY_INFORMATION", "STEP_BY_STEP"],
        firstMission: this.firstMission(selectedWorld),
        scoreSummary: {
          answered: answered.length,
          skipped,
          totalQuestions: TOTAL_PLACEMENT_QUESTIONS,
          completionRatio,
        },
      },
      update: {
        status: "READY",
        recommendedLevel,
        selectedWorld,
        strengths: ["PATTERN_RECOGNITION", "IMAGE_REASONING", "ORDERING"],
        focusAreas: ["EXPLAIN_REASONING", "VERIFY_INFORMATION", "STEP_BY_STEP"],
        firstMission: this.firstMission(selectedWorld),
        scoreSummary: {
          answered: answered.length,
          skipped,
          totalQuestions: TOTAL_PLACEMENT_QUESTIONS,
          completionRatio,
        },
      },
    });
  }

  private toOnboardingData(dto: SaveOnboardingDto) {
    return {
      learningGoal: dto.learningGoal,
      learningWorld: dto.learningWorld,
      gradeChoice: dto.gradeChoice,
      selfReportedLevel: dto.selfReportedLevel,
      learningFormats: dto.learningFormats ?? [],
      dailyDuration: dto.dailyDuration,
      studyTime: dto.studyTime,
      reminderPreference: dto.reminderPreference,
      rawAnswers: dto.rawAnswers as Prisma.InputJsonValue,
    };
  }

  private firstMission(worldKey: string) {
    return {
      id: `first-${worldKey.toLowerCase()}`,
      title:
        worldKey === "KODEX"
          ? "Gerbang Distribusi"
          : worldKey === "NUMERIA"
            ? "Pola Angka Pertama"
            : "Misteri Jadwal yang Berubah",
      durationMinutes: 8,
      activityCount: 5,
      rewardXp: 30,
    };
  }

  private placementQuestions() {
    return [
      {
        id: "placement-single-choice",
        questionType: "SINGLE_CHOICE",
        prompt: "Jika 3x + 5 = 20, berapa nilai x?",
        options: [
          { id: "a", label: "3" },
          { id: "b", label: "4" },
          { id: "c", label: "5" },
          { id: "d", label: "6" },
        ],
      },
      {
        id: "placement-multiple-select",
        questionType: "MULTIPLE_SELECT",
        prompt: "Manakah yang termasuk bilangan genap?",
        instruction: "Pilih semua jawaban yang sesuai.",
        options: [
          { id: "a", label: "3" },
          { id: "b", label: "4" },
          { id: "c", label: "6" },
          { id: "d", label: "9" },
        ],
      },
      {
        id: "placement-binary-choice",
        questionType: "BINARY_CHOICE",
        prompt: "Semua bilangan genap pasti habis dibagi 2.",
        options: [
          { id: "true", label: "Benar" },
          { id: "false", label: "Salah" },
        ],
      },
      {
        id: "placement-short-text",
        questionType: "SHORT_TEXT",
        prompt: "Berapa hasil dari 72 ÷ 8?",
        instruction: "Tulis jawaban berupa angka saja.",
        responseConfig: { inputMode: "numeric", maxLength: 20 },
      },
      {
        id: "placement-matching",
        questionType: "MATCHING",
        prompt: "Pasangkan istilah di kiri dengan pengertiannya di kanan!",
        matchingPairs: [
          {
            leftId: "variable",
            leftLabel: "Variable",
            rightId: "data",
            rightLabel: "Tempat menyimpan data yang nilainya dapat berubah.",
          },
          {
            leftId: "algorithm",
            leftLabel: "Algorithm",
            rightId: "steps",
            rightLabel: "Urutan langkah untuk menyelesaikan masalah.",
          },
          {
            leftId: "loop",
            leftLabel: "Loop",
            rightId: "repeat",
            rightLabel: "Struktur perulangan yang menjalankan blok kode berulang.",
          },
          {
            leftId: "function",
            leftLabel: "Function",
            rightId: "reuse",
            rightLabel: "Blok kode yang bisa digunakan kembali.",
          },
        ],
      },
      {
        id: "placement-ordering",
        questionType: "ORDERING",
        prompt: "Susun langkah-langkah fotosintesis dengan benar!",
        orderingItems: [
          { id: "water", label: "Air diserap akar dan diangkut ke daun." },
          { id: "carbon", label: "Karbon dioksida masuk melalui stomata daun." },
          { id: "light", label: "Cahaya matahari diserap oleh klorofil." },
          { id: "glucose", label: "Terbentuk glukosa sebagai makanan tumbuhan." },
        ],
      },
      {
        id: "placement-image-choice",
        questionType: "IMAGE_CHOICE",
        prompt: "Bulan manakah yang memiliki curah hujan tertinggi?",
        instruction: "Perhatikan grafik sederhana pada gambar.",
        media: { type: "image", url: "assets/mascot/kenalan.png" },
        options: [
          { id: "a", label: "Januari" },
          { id: "b", label: "Maret" },
          { id: "c", label: "Mei" },
          { id: "d", label: "Juni" },
        ],
      },
      {
        id: "placement-audio-choice",
        questionType: "AUDIO_CHOICE",
        prompt: "Dengarkan audio lalu pilih jawaban yang paling tepat.",
        media: {
          type: "audio",
          url: "audio/sfx/button_tap_soft_wood_kalimba_0_25s.ogg",
          durationSeconds: 1,
          maxReplay: 3,
          transcriptAvailable: false,
        },
        options: [
          { id: "a", label: "Instruksi belajar" },
          { id: "b", label: "Cerita liburan" },
          { id: "c", label: "Pengumuman hadiah" },
          { id: "d", label: "Daftar belanja" },
        ],
      },
      {
        id: "placement-long-text",
        questionType: "LONG_TEXT",
        prompt: "Jelaskan dengan singkat cara menjaga lingkungan sekolah.",
      },
      {
        id: "placement-code-input",
        questionType: "CODE_INPUT",
        prompt: "Lengkapi kode sederhana untuk menampilkan angka 1 sampai 3.",
        codeConfig: {
          language: "pseudo",
          initialCode: "for i in range(1, 4):\n  print(i)",
          backendExecutionEnabled: false,
        },
      },
      {
        id: "placement-image-hotspot",
        questionType: "IMAGE_HOTSPOT",
        prompt: "Ketuk posisi kucing pada gambar.",
        media: { type: "image", url: "assets/mascot/kenalan.png" },
        hotspotAreas: [
          { id: "cat", label: "Kucing", x: 0.62, y: 0.48, radius: 0.1 },
        ],
      },
      {
        id: "placement-voice-response",
        questionType: "VOICE_RESPONSE",
        prompt: "Apa yang dapat kita lakukan untuk menjaga kelestarian bumi?",
        media: { type: "image", url: "assets/mascot/analisis.png" },
      },
      {
        id: "placement-timeline-builder",
        questionType: "TIMELINE_BUILDER",
        prompt: "Susun urutan peristiwa berikut dengan benar!",
        timelineItems: [
          { id: "a", label: "Ayam berkokok menyambut pagi." },
          { id: "b", label: "Udin bangun tidur." },
          { id: "c", label: "Udin sarapan sebelum pergi ke sekolah." },
          { id: "e", label: "Udin berangkat ke sekolah." },
          { id: "d", label: "Udin sampai di sekolah tepat waktu." },
        ],
      },
    ];
  }

  private async assertStudent(studentProfileId: string) {
    const student = await this.prisma.studentProfile.findUnique({
      where: { id: studentProfileId },
    });
    if (!student) throw new NotFoundException("Sesi siswa tidak ditemukan.");
  }

  private async assertAttempt(attemptId: string) {
    const attempt = await this.prisma.placementAttempt.findUnique({
      where: { id: attemptId },
    });
    if (!attempt) throw new NotFoundException("Attempt tidak ditemukan.");
  }
}
