import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { AssignmentStatus, AttemptStatus, Prisma, XpReason } from "@prisma/client";
import { AuthenticatedUser } from "../../common/types/authenticated-user.type";
import { PrismaService } from "../../database/prisma/prisma.service";
import { ExperienceLedgerService } from "../experience-ledger/experience-ledger.service";
import { MasteryService } from "../mastery/mastery.service";
import { SaveCaseAnswerDto } from "./dto/save-case-answer.dto";
import { SubmitCaseAttemptDto } from "./dto/submit-case-attempt.dto";
import {
  computeCaseXpReward,
  computeOverallScore,
  evaluateCaseAnswer,
} from "./case-evaluation.util";

const assignmentInclude = {
  caseMission: {
    include: {
      evidence: { orderBy: { orderNumber: "asc" as const } },
      questions: {
        orderBy: { orderNumber: "asc" as const },
        include: { competency: { select: { id: true, name: true } } },
      },
    },
  },
  attempt: {
    include: { answers: true },
  },
} satisfies Prisma.CaseAssignmentInclude;

type AssignmentWithCase = Prisma.CaseAssignmentGetPayload<{
  include: typeof assignmentInclude;
}>;

const detectiveLessonPlan = {
  title: "Modul 1: Observasi Bukti Seperti Detektif",
  simpleGoal:
    "Kamu belajar membaca kasus dari dasar: menemukan fakta, memisahkan asumsi, mengecek sumber, lalu membuat kesimpulan yang adil.",
  bigIdea:
    "Detektif profesional tidak mulai dari menuduh. Mereka mulai dari pertanyaan: apa yang benar-benar kita tahu, dari mana kita tahu, dan bukti apa yang masih kurang?",
  learnSteps: [
    {
      title: "Fakta",
      body: "Fakta adalah informasi yang bisa dicek. Contoh: jadwal ruangan, catatan login, waktu file disimpan, isi pesan, atau rekaman kamera.",
      example:
        "Catatan login komputer: Budi login pukul 13.32. Ini fakta karena berasal dari sistem dan waktunya jelas.",
    },
    {
      title: "Asumsi",
      body: "Asumsi adalah dugaan yang belum cukup bukti. Asumsi boleh dicatat sebagai kemungkinan, tetapi belum boleh dipakai untuk menuduh.",
      example:
        "Meja berantakan berarti pelakunya panik. Ini masih asumsi karena meja berantakan bisa terjadi karena banyak sebab.",
    },
    {
      title: "Pengecoh",
      body: "Pengecoh adalah detail yang terlihat menarik, tetapi tidak langsung membantu menjawab pertanyaan utama.",
      example:
        "Warna tas seseorang mungkin terlihat mencolok, tetapi tidak relevan jika kasusnya tentang waktu file terakhir disimpan.",
    },
    {
      title: "Sumber kuat dan sumber lemah",
      body: "Sumber kuat biasanya otomatis, tercatat, atau bisa diverifikasi. Sumber lemah biasanya hanya ingatan, kesan, atau cerita satu orang.",
      example:
        "Log komputer lebih kuat daripada pernyataan 'seingatku dia lama di ruangan', karena log punya waktu yang spesifik.",
    },
    {
      title: "Kronologi",
      body: "Kronologi adalah urutan kejadian. Detektif menyusun waktu untuk melihat siapa yang punya kesempatan, apa yang berubah, dan bagian mana yang belum jelas.",
      example:
        "Jika file masih ada pukul 15.20 tetapi hilang pukul 15.45, maka fokus investigasi berada di rentang 15.20-15.45.",
    },
    {
      title: "Kesimpulan sementara",
      body: "Kesimpulan sementara harus menyebut bukti pendukung dan bagian yang belum pasti. Detektif yang baik berani berkata 'bukti belum cukup'.",
      example:
        "Kesimpulan aman: file kemungkinan berubah setelah pukul 15.20, tetapi belum cukup bukti untuk menuduh satu orang.",
    },
  ],
  professionalHabits: [
    "Tulis bukti apa adanya sebelum membuat dugaan.",
    "Pisahkan fakta, asumsi, dan pertanyaan yang belum terjawab.",
    "Cari lebih dari satu sumber sebelum percaya pada kesimpulan.",
    "Jangan menuduh orang jika bukti belum cukup.",
    "Saat menjawab, gunakan pola: bukti -> alasan -> kesimpulan.",
  ],
  caseStudies: [
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
  ],
  exampleCase: {
    story:
      "File presentasi hilang. Jadwal menunjukkan Dedi memakai ruangan pukul 15.00-15.45. Riwayat file menunjukkan file terakhir disimpan pukul 15.20 dan hilang saat dicek pukul 15.45.",
    goodAnswer:
      "Bukti terkuat adalah riwayat file pukul 15.20 dan waktu pengecekan pukul 15.45. Dedi memang berada di ruangan pada rentang itu, tetapi itu belum cukup untuk menuduh. Kemungkinan yang perlu dicek: file dipindahkan, berubah nama, terhapus tidak sengaja, atau disimpan di folder lain.",
    answerFormula: "Bukti yang kupakai adalah ... Maka kemungkinan ... Namun belum pasti karena ... Jadi langkah berikutnya ...",
    badAnswer:
      "Dedi pasti pelakunya karena dia orang terakhir di ruangan. Ini buruk karena langsung menuduh tanpa mengecek kemungkinan lain.",
  },
  investigationChecklist: [
    "Apa pertanyaan utama kasus ini?",
    "Bukti mana yang paling kuat?",
    "Bukti mana yang hanya sebagian membantu?",
    "Detail mana yang mungkin pengecoh?",
    "Apa minimal dua kemungkinan penjelasan?",
    "Bukti apa yang masih perlu dicari?",
    "Apakah kesimpulanku sudah adil dan tidak menuduh tanpa dasar?",
  ],
  testRubric: [
    "Jawaban menyebut bukti spesifik.",
    "Jawaban membedakan fakta dan asumsi.",
    "Jawaban memberi alasan, bukan hanya kesimpulan.",
    "Jawaban menyebut informasi yang masih perlu diverifikasi.",
    "Jawaban tidak menuduh tanpa bukti kuat.",
  ],
  masteryPath: {
    currentModule: "Observasi Bukti",
    nextModules: [
      "Kronologi kejadian",
      "Logika hipotesis",
      "Wawancara saksi",
      "Verifikasi sumber",
      "Etika laporan investigasi",
      "Kasus besar lintas bukti",
    ],
  },
  testRules: [
    "Baca materi dulu.",
    "Pelajari studi kasus dan contoh jawaban.",
    "Jawab tes dengan pola: bukti -> alasan -> kesimpulan.",
    "Kalau skor belum cukup, skill lemah akan muncul lagi di tes berikutnya dengan kasus baru.",
  ],
};

@Injectable()
export class StudentCasesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly experienceLedgerService: ExperienceLedgerService,
    private readonly masteryService: MasteryService,
  ) {}

  async getCurrentCase(currentUser: AuthenticatedUser, worldKey: string) {
    const studentProfileId = this.getStudentProfileId(currentUser);
    const world = await this.prisma.world.findUnique({ where: { key: worldKey } });

    if (!world || !world.isActive) {
      throw new NotFoundException("Dunia tidak ditemukan.");
    }

    const assignedDate = startOfDay(new Date());

    let assignment = await this.prisma.caseAssignment.findUnique({
      where: {
        studentProfileId_worldId_assignedDate: {
          studentProfileId,
          worldId: world.id,
          assignedDate,
        },
      },
      include: assignmentInclude,
    });

    if (!assignment) {
      const caseMission = await this.pickCaseForToday(world.id);

      assignment = await this.prisma.caseAssignment.create({
        data: {
          studentProfileId,
          worldId: world.id,
          caseMissionId: caseMission.id,
          assignedDate,
        },
        include: assignmentInclude,
      });
    }

    return this.serializeAssignment(assignment);
  }

  async startAttempt(currentUser: AuthenticatedUser, assignmentId: string) {
    const assignment = await this.getAssignmentForStudent(currentUser, assignmentId);

    if (assignment.attempt) {
      if (assignment.attempt.status !== AttemptStatus.IN_PROGRESS) {
        throw new BadRequestException("Kasus ini sudah diselesaikan.");
      }
      return assignment.attempt;
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.caseAssignment.update({
        where: { id: assignment.id },
        data: { status: AssignmentStatus.STARTED },
      });

      return tx.caseAttempt.create({
        data: { caseAssignmentId: assignment.id },
      });
    });
  }

  async saveAnswer(
    currentUser: AuthenticatedUser,
    attemptId: string,
    questionId: string,
    dto: SaveCaseAnswerDto,
  ) {
    const assignment = await this.getAssignmentForAttempt(currentUser, attemptId);
    this.ensureAttemptInProgress(assignment);
    this.ensureQuestionInCase(assignment, questionId);

    return this.prisma.caseAnswer.upsert({
      where: {
        caseAttemptId_caseQuestionId: { caseAttemptId: attemptId, caseQuestionId: questionId },
      },
      update: {
        answerText: dto.answerText,
        answeredAt: dto.answerText ? new Date() : undefined,
      },
      create: {
        caseAttemptId: attemptId,
        caseQuestionId: questionId,
        answerText: dto.answerText,
        answeredAt: dto.answerText ? new Date() : undefined,
      },
    });
  }

  async submitAttempt(
    currentUser: AuthenticatedUser,
    attemptId: string,
    dto: SubmitCaseAttemptDto,
  ) {
    const studentProfileId = this.getStudentProfileId(currentUser);
    const assignment = await this.getAssignmentForAttempt(currentUser, attemptId);
    this.ensureAttemptInProgress(assignment);

    return this.prisma.$transaction(async (tx) => {
      const freshAssignment = await tx.caseAssignment.findUnique({
        where: { id: assignment.id },
        include: assignmentInclude,
      });

      if (!freshAssignment?.attempt) {
        throw new NotFoundException("Attempt kasus tidak ditemukan.");
      }
      this.ensureAttemptInProgress(freshAssignment);

      const answersByQuestionId = new Map(
        freshAssignment.attempt.answers.map((answer) => [answer.caseQuestionId, answer]),
      );

      const evaluations = freshAssignment.caseMission.questions.map((question) =>
        evaluateCaseAnswer(
          { id: question.id, expectedKeywords: question.expectedKeywords },
          {
            questionId: question.id,
            answerText: answersByQuestionId.get(question.id)?.answerText ?? null,
          },
        ),
      );

      for (const evaluation of evaluations) {
        await tx.caseAnswer.upsert({
          where: {
            caseAttemptId_caseQuestionId: {
              caseAttemptId: attemptId,
              caseQuestionId: evaluation.questionId,
            },
          },
          update: { score: evaluation.score, matchedKeywords: evaluation.matchedKeywords },
          create: {
            caseAttemptId: attemptId,
            caseQuestionId: evaluation.questionId,
            answerText: answersByQuestionId.get(evaluation.questionId)?.answerText,
            score: evaluation.score,
            matchedKeywords: evaluation.matchedKeywords,
          },
        });

        const question = freshAssignment.caseMission.questions.find(
          (item) => item.id === evaluation.questionId,
        );
        if (question) {
          await this.masteryService.recordEvidence(tx, {
            studentProfileId,
            competencyId: question.competencyId,
            isCorrect: evaluation.score >= 60,
            sourceType: "CaseAnswer",
            sourceId: evaluation.questionId,
          });
        }
      }

      const overallScore = computeOverallScore(evaluations);
      const xpReward = computeCaseXpReward(evaluations);

      const xpResult = await this.experienceLedgerService.appendXp(tx, {
        studentProfileId,
        worldId: freshAssignment.worldId,
        amount: xpReward,
        reason: XpReason.MISSION_COMPLETED,
        sourceType: "CaseAttempt",
        sourceId: attemptId,
      });

      await this.experienceLedgerService.registerDailyActivity(tx, studentProfileId);

      await tx.caseAssignment.update({
        where: { id: freshAssignment.id },
        data: { status: AssignmentStatus.COMPLETED },
      });

      await tx.caseAttempt.update({
        where: { id: attemptId },
        data: {
          status: AttemptStatus.SUBMITTED,
          submittedAt: new Date(),
          conclusionText: dto.conclusionText,
          confidenceLevel: dto.confidenceLevel,
          overallScore,
        },
      });

      return {
        attemptId,
        overallScore,
        xpGained: xpReward,
        gameProfile: xpResult,
        questions: evaluations.map((evaluation) => {
          const question = freshAssignment.caseMission.questions.find(
            (item) => item.id === evaluation.questionId,
          );

          return {
            questionId: evaluation.questionId,
            prompt: question?.prompt,
            skill: question?.competency,
            answerText: answersByQuestionId.get(evaluation.questionId)?.answerText ?? null,
            score: evaluation.score,
            matchedKeywords: evaluation.matchedKeywords,
            missingKeywords: evaluation.missingKeywords,
            expectedReasoning: question?.expectedReasoning,
          };
        }),
      };
    });
  }

  async getResult(currentUser: AuthenticatedUser, attemptId: string) {
    const assignment = await this.getAssignmentForAttempt(currentUser, attemptId);

    if (!assignment.attempt || assignment.attempt.status !== AttemptStatus.SUBMITTED) {
      throw new BadRequestException("Kasus belum disubmit.");
    }

    const answersByQuestionId = new Map(
      assignment.attempt.answers.map((answer) => [answer.caseQuestionId, answer]),
    );

    const questions = assignment.caseMission.questions.map((question) => {
      const answer = answersByQuestionId.get(question.id);

      return {
        questionId: question.id,
        prompt: question.prompt,
        skill: question.competency,
        answerText: answer?.answerText ?? null,
        score: answer?.score ? Number(answer.score) : 0,
        matchedKeywords: answer?.matchedKeywords ?? [],
        expectedReasoning: question.expectedReasoning,
      };
    });
    const weakQuestions = questions.filter((question) => question.score < 60);

    return {
      attemptId,
      title: assignment.caseMission.title,
      overallScore: assignment.attempt.overallScore ? Number(assignment.attempt.overallScore) : 0,
      conclusionText: assignment.attempt.conclusionText,
      confidenceLevel: assignment.attempt.confidenceLevel,
      questions,
      nextRecommendation: {
        canRetakeSameCase: false,
        title:
          weakQuestions.length > 0
            ? "Belajar ulang singkat, lalu tes berikutnya akan mengulang skill yang lemah."
            : "Bagus. Tes berikutnya naik ke kasus dengan bukti lebih banyak.",
        message:
          weakQuestions.length > 0
            ? `Skill yang perlu diulang: ${weakQuestions
                .map((question) => question.skill.name)
                .join(", ")}. Kamu tidak perlu mengulang kasus yang sama; sistem akan memberi kasus baru dengan pola mirip.`
            : "Kamu sudah cukup kuat di modul ini. Lanjut ke kronologi dan hubungan sebab-akibat.",
        focusSkills: weakQuestions.map((question) => question.skill.name),
      },
    };
  }

  private async pickCaseForToday(worldId: string) {
    const activeCase = await this.prisma.caseMission.findFirst({
      where: { worldId, status: "ACTIVE" },
      orderBy: { createdAt: "asc" },
    });

    if (!activeCase) {
      throw new NotFoundException("Belum ada kasus aktif untuk dunia ini.");
    }

    return activeCase;
  }

  private serializeAssignment(assignment: AssignmentWithCase) {
    const isSubmitted = assignment.attempt?.status === AttemptStatus.SUBMITTED;
    const answersByQuestionId = new Map(
      (assignment.attempt?.answers ?? []).map((answer) => [answer.caseQuestionId, answer]),
    );

    return {
      assignmentId: assignment.id,
      worldId: assignment.worldId,
      status: assignment.status,
      case: {
        id: assignment.caseMission.id,
        title: assignment.caseMission.title,
        openingStory: assignment.caseMission.openingStory,
        estimatedMinutes: assignment.caseMission.estimatedMinutes,
      },
      lessonPlan: detectiveLessonPlan,
      attempt: assignment.attempt
        ? { id: assignment.attempt.id, status: assignment.attempt.status }
        : null,
      evidence: assignment.caseMission.evidence.map((item) => ({
        id: item.id,
        orderNumber: item.orderNumber,
        type: item.type,
        content: item.content,
        relevance: item.relevance,
        sourceStrength: item.sourceStrength,
      })),
      questions: assignment.caseMission.questions.map((question) => ({
        id: question.id,
        orderNumber: question.orderNumber,
        prompt: question.prompt,
        skill: question.competency,
        answerText: answersByQuestionId.get(question.id)?.answerText ?? null,
        // expectedKeywords/expectedReasoning sengaja tidak dikirim - itu kunci
        // jawaban dan hanya boleh terlihat setelah attempt disubmit.
        score: isSubmitted ? Number(answersByQuestionId.get(question.id)?.score ?? 0) : undefined,
      })),
    };
  }

  private getStudentProfileId(currentUser: AuthenticatedUser) {
    if (!currentUser.studentProfileId) {
      throw new ForbiddenException("Akses hanya untuk siswa.");
    }
    return currentUser.studentProfileId;
  }

  private async getAssignmentForStudent(currentUser: AuthenticatedUser, assignmentId: string) {
    const studentProfileId = this.getStudentProfileId(currentUser);
    const assignment = await this.prisma.caseAssignment.findFirst({
      where: { id: assignmentId, studentProfileId },
      include: assignmentInclude,
    });

    if (!assignment) {
      throw new NotFoundException("Kasus tidak ditemukan.");
    }
    return assignment;
  }

  private async getAssignmentForAttempt(currentUser: AuthenticatedUser, attemptId: string) {
    const studentProfileId = this.getStudentProfileId(currentUser);
    const assignment = await this.prisma.caseAssignment.findFirst({
      where: { studentProfileId, attempt: { id: attemptId } },
      include: assignmentInclude,
    });

    if (!assignment) {
      throw new NotFoundException("Attempt kasus tidak ditemukan.");
    }
    return assignment;
  }

  private ensureAttemptInProgress(assignment: AssignmentWithCase) {
    if (!assignment.attempt || assignment.attempt.status !== AttemptStatus.IN_PROGRESS) {
      throw new BadRequestException("Attempt kasus sudah tidak aktif.");
    }
  }

  private ensureQuestionInCase(assignment: AssignmentWithCase, questionId: string) {
    const exists = assignment.caseMission.questions.some((question) => question.id === questionId);
    if (!exists) {
      throw new BadRequestException("Pertanyaan tidak termasuk dalam kasus ini.");
    }
  }
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}
