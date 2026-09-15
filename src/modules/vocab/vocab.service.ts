import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma, VocabDisplayLanguage, VocabLevel, VocabWord } from "@prisma/client";
import { AuthenticatedUser } from "../../common/types/authenticated-user.type";
import { PrismaService } from "../../database/prisma/prisma.service";
import { CreateVocabCategoryDto, UpdateVocabCategoryDto } from "./dto/vocab-category.dto";
import {
  CreateVocabWordDto,
  QueryVocabWordDto,
  UpdateVocabWordDto,
} from "./dto/vocab-word.dto";
import { UpdateVocabSettingDto } from "./dto/update-vocab-setting.dto";

@Injectable()
export class VocabService {
  constructor(private readonly prisma: PrismaService) {}

  // --- Student: pengaturan ---

  async getSetting(currentUser: AuthenticatedUser) {
    const setting = await this.getOrCreateSetting(
      this.getStudentProfileId(currentUser),
    );
    return this.serializeSetting(setting);
  }

  async updateSetting(currentUser: AuthenticatedUser, dto: UpdateVocabSettingDto) {
    const studentProfileId = this.getStudentProfileId(currentUser);
    await this.getOrCreateSetting(studentProfileId);

    if (
      dto.notificationStartHour !== undefined &&
      dto.notificationEndHour !== undefined &&
      dto.notificationStartHour >= dto.notificationEndHour
    ) {
      throw new BadRequestException(
        "Jam mulai notifikasi harus lebih awal dari jam akhir.",
      );
    }

    const updated = await this.prisma.studentVocabSetting.update({
      where: { studentProfileId },
      data: {
        dailyCount: dto.dailyCount,
        displayLanguage: dto.displayLanguage,
        notificationEnabled: dto.notificationEnabled,
        widgetEnabled: dto.widgetEnabled,
        notificationStartHour: dto.notificationStartHour,
        notificationEndHour: dto.notificationEndHour,
        levels: dto.levels,
        categoryKeys: dto.categoryKeys,
      },
    });

    return this.serializeSetting(updated);
  }

  // --- Student: kategori aktif untuk dipilih di setting ---

  async listActiveCategories() {
    return this.prisma.vocabCategory.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, key: true, name: true },
    });
  }

  // --- Student: kosakata harian ---

  async getDailyWords(currentUser: AuthenticatedUser) {
    const studentProfileId = this.getStudentProfileId(currentUser);
    const setting = await this.getOrCreateSetting(studentProfileId);
    const today = this.todayDateOnly();

    let deliveries = await this.prisma.studentVocabDelivery.findMany({
      where: { studentProfileId, deliveryDate: today },
      include: { vocabWord: { include: { category: true } } },
      orderBy: { createdAt: "asc" },
    });

    const needed = setting.dailyCount - deliveries.length;
    if (needed > 0) {
      const picked = await this.pickWordsForStudent(studentProfileId, setting, needed);
      const created = await Promise.all(
        picked.map((word) =>
          this.prisma.studentVocabDelivery.upsert({
            where: {
              studentProfileId_vocabWordId_deliveryDate: {
                studentProfileId,
                vocabWordId: word.id,
                deliveryDate: today,
              },
            },
            update: {},
            create: { studentProfileId, vocabWordId: word.id, deliveryDate: today },
            include: { vocabWord: { include: { category: true } } },
          }),
        ),
      );
      deliveries = [...deliveries, ...created];
    }

    // Kalau siswa menurunkan dailyCount setelah kata hari ini sudah dibuat,
    // baris delivery lama tetap disimpan (riwayat), tapi yang ditampilkan
    // dipotong supaya konsisten dengan setting terbaru.
    const wordsToShow = deliveries.slice(0, setting.dailyCount);

    return {
      date: today.toISOString().slice(0, 10),
      setting: this.serializeSetting(setting),
      words: wordsToShow.map((delivery) => this.serializeWord(delivery.vocabWord)),
    };
  }

  private async pickWordsForStudent(
    studentProfileId: string,
    setting: { levels: VocabLevel[]; categoryKeys: string[] },
    needed: number,
  ) {
    const baseWhere: Prisma.VocabWordWhereInput = {
      isActive: true,
      ...(setting.levels.length ? { level: { in: setting.levels } } : {}),
      ...(setting.categoryKeys.length
        ? { category: { key: { in: setting.categoryKeys } } }
        : {}),
    };

    const previousDeliveries = await this.prisma.studentVocabDelivery.findMany({
      where: { studentProfileId },
      select: { vocabWordId: true },
    });
    const previousIds = previousDeliveries.map((delivery) => delivery.vocabWordId);

    let candidates = await this.prisma.vocabWord.findMany({
      where: { ...baseWhere, id: { notIn: previousIds } },
      include: { category: true },
    });

    if (candidates.length < needed) {
      // Baru izinkan pengulangan kalau bank kata sesuai filter benar-benar
      // sudah habis untuk siswa ini.
      candidates = await this.prisma.vocabWord.findMany({
        where: baseWhere,
        include: { category: true },
      });
    }

    return this.pickRandom(candidates, needed);
  }

  private pickRandom<T>(pool: T[], count: number): T[] {
    const shuffled = [...pool];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled.slice(0, count);
  }

  private todayDateOnly() {
    return new Date(new Date().toISOString().slice(0, 10));
  }

  // --- Admin: kategori ---

  async createCategory(dto: CreateVocabCategoryDto) {
    const existing = await this.prisma.vocabCategory.findUnique({
      where: { key: dto.key },
    });
    if (existing) {
      throw new BadRequestException("Key kategori sudah dipakai.");
    }
    return this.prisma.vocabCategory.create({ data: dto });
  }

  async listCategoriesForAdmin() {
    return this.prisma.vocabCategory.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { words: true } } },
    });
  }

  async updateCategory(categoryId: string, dto: UpdateVocabCategoryDto) {
    await this.ensureCategory(categoryId);
    return this.prisma.vocabCategory.update({
      where: { id: categoryId },
      data: dto,
    });
  }

  async deleteCategory(categoryId: string) {
    await this.ensureCategory(categoryId);
    return this.prisma.vocabCategory.update({
      where: { id: categoryId },
      data: { isActive: false },
    });
  }

  private async ensureCategory(categoryId: string) {
    const category = await this.prisma.vocabCategory.findUnique({
      where: { id: categoryId },
    });
    if (!category) throw new NotFoundException("Kategori tidak ditemukan.");
    return category;
  }

  // --- Admin: kata ---

  async createWord(dto: CreateVocabWordDto) {
    await this.ensureCategory(dto.categoryId);
    return this.prisma.vocabWord.create({
      data: {
        categoryId: dto.categoryId,
        english: dto.english.trim(),
        indonesian: dto.indonesian?.trim(),
        korean: dto.korean.trim(),
        koreanRomanized: dto.koreanRomanized?.trim(),
        exampleSentenceEn: dto.exampleSentenceEn?.trim(),
        exampleSentenceKo: dto.exampleSentenceKo?.trim(),
        level: dto.level,
      },
      include: { category: true },
    });
  }

  async listWordsForAdmin(query: QueryVocabWordDto) {
    const where: Prisma.VocabWordWhereInput = {
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...(query.level ? { level: query.level } : {}),
      ...(query.search
        ? {
            OR: [
              { english: { contains: query.search, mode: "insensitive" } },
              { indonesian: { contains: query.search, mode: "insensitive" } },
              { korean: { contains: query.search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    return this.prisma.vocabWord.findMany({
      where,
      include: { category: true },
      orderBy: { createdAt: "desc" },
    });
  }

  async updateWord(wordId: string, dto: UpdateVocabWordDto) {
    await this.ensureWord(wordId);
    if (dto.categoryId) await this.ensureCategory(dto.categoryId);

    return this.prisma.vocabWord.update({
      where: { id: wordId },
      data: {
        categoryId: dto.categoryId,
        english: dto.english?.trim(),
        indonesian: dto.indonesian?.trim(),
        korean: dto.korean?.trim(),
        koreanRomanized: dto.koreanRomanized?.trim(),
        exampleSentenceEn: dto.exampleSentenceEn?.trim(),
        exampleSentenceKo: dto.exampleSentenceKo?.trim(),
        level: dto.level,
        isActive: dto.isActive,
      },
      include: { category: true },
    });
  }

  async deleteWord(wordId: string) {
    await this.ensureWord(wordId);
    return this.prisma.vocabWord.update({
      where: { id: wordId },
      data: { isActive: false },
    });
  }

  private async ensureWord(wordId: string) {
    const word = await this.prisma.vocabWord.findUnique({ where: { id: wordId } });
    if (!word) throw new NotFoundException("Kosakata tidak ditemukan.");
    return word;
  }

  // --- Helpers ---

  private async getOrCreateSetting(studentProfileId: string) {
    const existing = await this.prisma.studentVocabSetting.findUnique({
      where: { studentProfileId },
    });
    if (existing) return existing;
    return this.prisma.studentVocabSetting.create({ data: { studentProfileId } });
  }

  private serializeSetting(setting: {
    dailyCount: number;
    displayLanguage: VocabDisplayLanguage;
    notificationEnabled: boolean;
    widgetEnabled: boolean;
    notificationStartHour: number;
    notificationEndHour: number;
    levels: VocabLevel[];
    categoryKeys: string[];
  }) {
    return {
      dailyCount: setting.dailyCount,
      displayLanguage: setting.displayLanguage,
      notificationEnabled: setting.notificationEnabled,
      widgetEnabled: setting.widgetEnabled,
      notificationStartHour: setting.notificationStartHour,
      notificationEndHour: setting.notificationEndHour,
      levels: setting.levels,
      categoryKeys: setting.categoryKeys,
    };
  }

  private serializeWord(
    word: VocabWord & { category: { id: string; key: string; name: string } },
  ) {
    return {
      id: word.id,
      english: word.english,
      indonesian: word.indonesian,
      korean: word.korean,
      koreanRomanized: word.koreanRomanized,
      exampleSentenceEn: word.exampleSentenceEn,
      exampleSentenceKo: word.exampleSentenceKo,
      level: word.level,
      category: word.category,
    };
  }

  private getStudentProfileId(currentUser: AuthenticatedUser) {
    if (!currentUser.studentProfileId) {
      throw new ForbiddenException("Akses hanya untuk siswa.");
    }
    return currentUser.studentProfileId;
  }
}
