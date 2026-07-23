import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { AuthenticatedUser } from "../../common/types/authenticated-user.type";
import { PrismaService } from "../../database/prisma/prisma.service";
import { LinkSchoolDto } from "./dto/link-school.dto";
import { UpdateStudentProfileDto } from "./dto/update-student-profile.dto";

@Injectable()
export class StudentAccountService {
  constructor(private readonly prisma: PrismaService) {}

  async searchSchools(search?: string) {
    const where: Prisma.SchoolWhereInput = {
      isActive: true,
      deletedAt: null,
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { city: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    return this.prisma.school.findMany({
      where,
      select: { id: true, name: true, city: true, province: true },
      orderBy: { name: "asc" },
      take: 10,
    });
  }

  async linkSchool(currentUser: AuthenticatedUser, dto: LinkSchoolDto) {
    const studentProfileId = this.getStudentProfileId(currentUser);
    const school = await this.prisma.school.findFirst({
      where: { id: dto.schoolId, isActive: true, deletedAt: null },
    });

    if (!school) {
      throw new NotFoundException("Sekolah tidak ditemukan.");
    }

    return this.prisma.studentProfile.update({
      where: { id: studentProfileId },
      data: { schoolId: school.id },
      select: {
        id: true,
        school: { select: { id: true, name: true, city: true } },
      },
    });
  }

  async unlinkSchool(currentUser: AuthenticatedUser) {
    const studentProfileId = this.getStudentProfileId(currentUser);

    return this.prisma.studentProfile.update({
      where: { id: studentProfileId },
      data: { schoolId: null },
      select: { id: true, school: true },
    });
  }

  async updateProfile(currentUser: AuthenticatedUser, dto: UpdateStudentProfileDto) {
    const studentProfileId = this.getStudentProfileId(currentUser);

    return this.prisma.studentProfile.update({
      where: { id: studentProfileId },
      data: {
        fullName: dto.fullName,
        gradeLevel: dto.gradeLevel,
        careerPath: dto.careerPath,
      },
      select: { id: true, fullName: true, gradeLevel: true, careerPath: true },
    });
  }

  private getStudentProfileId(currentUser: AuthenticatedUser) {
    if (!currentUser.studentProfileId) {
      throw new ForbiddenException("Akses hanya untuk siswa.");
    }

    return currentUser.studentProfileId;
  }
}
