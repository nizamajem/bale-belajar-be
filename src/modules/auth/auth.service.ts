import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService, JwtSignOptions } from "@nestjs/jwt";
import { UserRole, UserStatus } from "@prisma/client";
import * as bcrypt from "bcrypt";
import { PrismaService } from "../../database/prisma/prisma.service";
import { AuthenticatedUser } from "../../common/types/authenticated-user.type";
import { GoogleLoginDto } from "./dto/google-login.dto";
import { LoginDto } from "./dto/login.dto";
import { RegisterStudentDto } from "./dto/register-student.dto";
import { StudentLoginDto } from "./dto/student-login.dto";
import { AuthTokenPayload } from "./types/auth-token-payload.type";
import { getFirebaseAuth } from "./firebase-admin.util";

const PASSWORD_HASH_ROUNDS = 12;

type AuthResponse = {
  accessToken: string;
  user: {
    id: string;
    name: string;
    email?: string;
    avatarUrl?: string;
    role: UserRole;
    schoolId?: string;
    teacherProfileId?: string;
    studentProfileId?: string;
  };
};

@Injectable()
export class AuthService {
  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async login(dto: LoginDto): Promise<AuthResponse> {
    const user = await this.prisma.user.findFirst({
      where: {
        email: dto.email,
        deletedAt: null,
        status: UserStatus.ACTIVE,
      },
      include: {
        teacherProfile: true,
        studentProfile: true,
      },
    });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException("Email atau password tidak valid.");
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException("Email atau password tidak valid.");
    }

    const schoolId = user.teacherProfile?.schoolId ?? user.studentProfile?.schoolId ?? undefined;
    const teacherProfileId = user.teacherProfile?.id;
    const studentProfileId = user.studentProfile?.id;

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return {
      accessToken: await this.signAccessToken({
        sub: user.id,
        role: user.role,
        schoolId,
        teacherProfileId,
        studentProfileId,
      }),
      user: {
        id: user.id,
        name: user.name,
        email: user.email ?? undefined,
        role: user.role,
        schoolId,
        teacherProfileId,
        studentProfileId,
      },
    };
  }

  /**
   * Registrasi mandiri siswa dengan email+password (tanpa kode peserta,
   * tanpa sekolah). Sekolah bisa dihubungkan belakangan lewat modul
   * student-account, sama seperti alur Google.
   */
  async registerStudent(dto: RegisterStudentDto): Promise<AuthResponse> {
    const existing = await this.prisma.user.findFirst({
      where: { email: dto.email.trim().toLowerCase() },
    });

    if (existing) {
      throw new ConflictException("Email sudah terdaftar. Silakan masuk.");
    }

    const passwordHash = await bcrypt.hash(dto.password, PASSWORD_HASH_ROUNDS);

    const user = await this.prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          name: dto.name.trim(),
          email: dto.email.trim().toLowerCase(),
          passwordHash,
          role: UserRole.STUDENT,
          status: UserStatus.ACTIVE,
        },
      });

      await tx.studentProfile.create({
        data: {
          userId: createdUser.id,
          fullName: createdUser.name,
          gradeLevel: dto.gradeLevel,
        },
      });

      return tx.user.findUniqueOrThrow({
        where: { id: createdUser.id },
        include: { studentProfile: true },
      });
    });

    return {
      accessToken: await this.signAccessToken({
        sub: user.id,
        role: UserRole.STUDENT,
        studentProfileId: user.studentProfile?.id,
      }),
      user: {
        id: user.id,
        name: user.name,
        email: user.email ?? undefined,
        role: UserRole.STUDENT,
        studentProfileId: user.studentProfile?.id,
      },
    };
  }

  async studentLogin(dto: StudentLoginDto): Promise<AuthResponse> {
    const student = await this.prisma.studentProfile.findFirst({
      where: {
        participantCode: dto.participantCode.trim().toUpperCase(),
        deletedAt: null,
        isActive: true,
      },
    });

    if (!student) {
      throw new UnauthorizedException("Kode peserta tidak valid.");
    }

    const user =
      student.userId === null
        ? await this.prisma.user.create({
            data: {
              name: student.fullName,
              role: UserRole.STUDENT,
              status: UserStatus.ACTIVE,
            },
          })
        : await this.prisma.user.findUniqueOrThrow({
            where: { id: student.userId },
          });

    if (student.userId === null) {
      await this.prisma.studentProfile.update({
        where: { id: student.id },
        data: { userId: user.id },
      });
    }

    return {
      accessToken: await this.signAccessToken({
        sub: user.id,
        role: UserRole.STUDENT,
        schoolId: student.schoolId ?? undefined,
        studentProfileId: student.id,
      }),
      user: {
        id: user.id,
        name: student.fullName,
        role: UserRole.STUDENT,
        schoolId: student.schoolId ?? undefined,
        studentProfileId: student.id,
      },
    };
  }

  /**
   * Registrasi/login siswa umum lewat Google Sign-In (via Firebase
   * Authentication). Sekolah TIDAK diwajibkan di sini - StudentProfile
   * dibuat tanpa schoolId/participantCode dan siswa bisa menghubungkannya
   * belakangan lewat modul student-account.
   */
  async loginWithGoogle(
    dto: GoogleLoginDto,
  ): Promise<AuthResponse & { isNewUser: boolean }> {
    let payload: {
      uid: string;
      email?: string;
      name?: string;
      picture?: string;
      email_verified?: boolean;
    };

    try {
      const decoded = await getFirebaseAuth(this.configService).verifyIdToken(
        dto.idToken,
      );
      payload = decoded;
    } catch {
      throw new UnauthorizedException("Token Firebase tidak valid.");
    }

    if (!payload.email || payload.email_verified === false) {
      throw new UnauthorizedException("Email Google belum terverifikasi.");
    }

    let user = await this.prisma.user.findFirst({
      where: { firebaseUid: payload.uid },
      include: { studentProfile: true },
    });
    let isNewUser = false;

    if (!user) {
      const existingByEmail = await this.prisma.user.findFirst({
        where: { email: payload.email },
        include: { studentProfile: true },
      });

      if (existingByEmail) {
        user = await this.prisma.user.update({
          where: { id: existingByEmail.id },
          data: { firebaseUid: payload.uid, avatarUrl: payload.picture },
          include: { studentProfile: true },
        });
      } else {
        isNewUser = true;
        user = await this.prisma.$transaction(async (tx) => {
          const createdUser = await tx.user.create({
            data: {
              name: payload.name ?? payload.email!.split("@")[0],
              email: payload.email,
              firebaseUid: payload.uid,
              avatarUrl: payload.picture,
              role: UserRole.STUDENT,
              status: UserStatus.ACTIVE,
            },
          });

          await tx.studentProfile.create({
            data: {
              userId: createdUser.id,
              fullName: createdUser.name,
            },
          });

          return tx.user.findUniqueOrThrow({
            where: { id: createdUser.id },
            include: { studentProfile: true },
          });
        });
      }
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const studentProfile = user.studentProfile;

    return {
      isNewUser,
      accessToken: await this.signAccessToken({
        sub: user.id,
        role: user.role,
        schoolId: studentProfile?.schoolId ?? undefined,
        studentProfileId: studentProfile?.id,
      }),
      user: {
        id: user.id,
        name: user.name,
        email: user.email ?? undefined,
        avatarUrl: user.avatarUrl ?? undefined,
        role: user.role,
        schoolId: studentProfile?.schoolId ?? undefined,
        studentProfileId: studentProfile?.id,
      },
    };
  }

  async getMe(currentUser: AuthenticatedUser) {
    const user = await this.prisma.user.findUnique({
      where: {
        id: currentUser.id,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        avatarUrl: true,
        role: true,
        status: true,
        teacherProfile: {
          select: {
            id: true,
            schoolId: true,
            subjectSpecialization: true,
          },
        },
        studentProfile: {
          select: {
            id: true,
            schoolId: true,
            participantCode: true,
            fullName: true,
            academicYear: true,
            gradeLevel: true,
            school: {
              select: { id: true, name: true, city: true },
            },
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException("User tidak ditemukan.");
    }

    return user;
  }

  private async signAccessToken(payload: AuthTokenPayload): Promise<string> {
    const expiresIn = this.configService.get<string>(
      "JWT_ACCESS_EXPIRES_IN",
      "15m",
    ) as JwtSignOptions["expiresIn"];

    return this.jwtService.signAsync(payload, {
      secret: this.configService.get<string>("JWT_ACCESS_SECRET", "replace_me"),
      expiresIn,
    });
  }
}
