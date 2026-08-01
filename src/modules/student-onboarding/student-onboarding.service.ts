import { ForbiddenException, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { AuthenticatedUser } from "../../common/types/authenticated-user.type";
import { PrismaService } from "../../database/prisma/prisma.service";
import { SaveOnboardingDto } from "./dto/save-onboarding.dto";

type OnboardingData = {
  learningGoal?: string;
  learningWorld?: string;
  gradeChoice?: string;
  selfReportedLevel?: string;
  learningFormats?: string[];
  dailyDuration?: string;
  studyTime?: string;
  reminderPreference?: string;
  rawAnswers?: Prisma.InputJsonValue;
};

@Injectable()
export class StudentOnboardingService {
  constructor(private readonly prisma: PrismaService) {}

  async getStatus(currentUser: AuthenticatedUser) {
    const studentProfileId = this.getStudentProfileId(currentUser);
    const onboarding = await this.prisma.studentOnboarding.findUnique({
      where: { studentProfileId },
    });

    return {
      completed: Boolean(onboarding?.completedAt),
      onboarding,
      nextRoute: onboarding?.completedAt ? "PLACEMENT_TEST" : "ONBOARDING",
    };
  }

  async saveAnswers(currentUser: AuthenticatedUser, dto: SaveOnboardingDto) {
    const studentProfileId = this.getStudentProfileId(currentUser);

    return this.prisma.studentOnboarding.upsert({
      where: { studentProfileId },
      create: {
        studentProfileId,
        ...this.toData(dto),
      },
      update: this.toData(dto),
    });
  }

  async complete(currentUser: AuthenticatedUser, dto: SaveOnboardingDto) {
    const studentProfileId = this.getStudentProfileId(currentUser);
    const data = {
      ...this.toData(dto),
      completedAt: new Date(),
    };

    const onboarding = await this.prisma.studentOnboarding.upsert({
      where: { studentProfileId },
      create: { studentProfileId, ...data },
      update: data,
    });

    return {
      onboarding,
      nextRoute: "PLACEMENT_TEST",
    };
  }

  private toData(dto: SaveOnboardingDto): OnboardingData {
    const data: OnboardingData = {};
    if (dto.learningGoal !== undefined) data.learningGoal = dto.learningGoal;
    if (dto.learningWorld !== undefined) data.learningWorld = dto.learningWorld;
    if (dto.gradeChoice !== undefined) data.gradeChoice = dto.gradeChoice;
    if (dto.selfReportedLevel !== undefined) {
      data.selfReportedLevel = dto.selfReportedLevel;
    }
    if (dto.learningFormats !== undefined) {
      data.learningFormats = dto.learningFormats;
    }
    if (dto.dailyDuration !== undefined) data.dailyDuration = dto.dailyDuration;
    if (dto.studyTime !== undefined) data.studyTime = dto.studyTime;
    if (dto.reminderPreference !== undefined) {
      data.reminderPreference = dto.reminderPreference;
    }
    if (dto.rawAnswers !== undefined) {
      data.rawAnswers = dto.rawAnswers as Prisma.InputJsonValue;
    }
    return data;
  }

  private getStudentProfileId(currentUser: AuthenticatedUser) {
    if (!currentUser.studentProfileId) {
      throw new ForbiddenException("Akses hanya untuk siswa.");
    }
    return currentUser.studentProfileId;
  }
}
