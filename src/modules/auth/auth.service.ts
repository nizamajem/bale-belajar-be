import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService, JwtSignOptions } from "@nestjs/jwt";
import { UserRole, UserStatus } from "@prisma/client";
import * as bcrypt from "bcrypt";
import { OAuth2Client } from "google-auth-library";
import { PrismaService } from "../../database/prisma/prisma.service";
import { AuthenticatedUser } from "../../common/types/authenticated-user.type";
import { GoogleLoginDto } from "./dto/google-login.dto";
import { LoginDto } from "./dto/login.dto";
import { StudentLoginDto } from "./dto/student-login.dto";
import { AuthTokenPayload } from "./types/auth-token-payload.type";

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
      },
    });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException("Email atau password tidak valid.");
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException("Email atau password tidak valid.");
    }

    const schoolId = user.teacherProfile?.schoolId;
    const teacherProfileId = user.teacherProfile?.id;

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
      }),
      user: {
        id: user.id,
        name: user.name,
        email: user.email ?? undefined,
        role: user.role,
        schoolId,
        teacherProfileId,
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
   * Registrasi/login siswa umum lewat Google Sign-In. Sekolah TIDAK
   * diwajibkan di sini - StudentProfile dibuat tanpa schoolId/participantCode
   * dan siswa bisa menghubungkannya belakangan lewat modul student-account.
   */
  async loginWithGoogle(
    dto: GoogleLoginDto,
  ): Promise<AuthResponse & { isNewUser: boolean }> {
    const googleClientId = this.configService.get<string>("GOOGLE_CLIENT_ID");
    const client = new OAuth2Client(googleClientId);

    let payload: {
      sub: string;
      email?: string;
      name?: string;
      picture?: string;
      email_verified?: boolean;
    };

    try {
      const ticket = await client.verifyIdToken({
        idToken: dto.idToken,
        audience: googleClientId,
      });
      const ticketPayload = ticket.getPayload();
      if (!ticketPayload) {
        throw new Error("Payload token Google kosong.");
      }
      payload = ticketPayload;
    } catch {
      throw new UnauthorizedException("Token Google tidak valid.");
    }

    if (!payload.email || payload.email_verified === false) {
      throw new UnauthorizedException("Email Google belum terverifikasi.");
    }

    let user = await this.prisma.user.findFirst({
      where: { googleId: payload.sub },
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
          data: { googleId: payload.sub, avatarUrl: payload.picture },
          include: { studentProfile: true },
        });
      } else {
        isNewUser = true;
        user = await this.prisma.$transaction(async (tx) => {
          const createdUser = await tx.user.create({
            data: {
              name: payload.name ?? payload.email!.split("@")[0],
              email: payload.email,
              googleId: payload.sub,
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
