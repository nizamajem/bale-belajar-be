import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService, JwtSignOptions } from "@nestjs/jwt";
import { UserRole, UserStatus } from "@prisma/client";
import * as bcrypt from "bcrypt";
import { PrismaService } from "../../database/prisma/prisma.service";
import { AuthenticatedUser } from "../../common/types/authenticated-user.type";
import { AddRoleDto } from "./dto/add-role.dto";
import { GoogleLoginDto } from "./dto/google-login.dto";
import { LoginDto } from "./dto/login.dto";
import { RegisterStudentDto } from "./dto/register-student.dto";
import { StudentLoginDto } from "./dto/student-login.dto";
import { SwitchRoleDto } from "./dto/switch-role.dto";
import { AuthTokenPayload } from "./types/auth-token-payload.type";
import { getFirebaseAuth } from "./firebase-admin.util";

const PASSWORD_HASH_ROUNDS = 12;

// Peran yang boleh ditambahkan sendiri oleh user lewat addRole(). Admin/Super
// Admin sengaja tidak termasuk - peran itu tetap dikelola manual/terpisah.
const SELF_SERVICE_ROLES: UserRole[] = [UserRole.STUDENT, UserRole.TEACHER];

type AuthResponse = {
  accessToken: string;
  user: {
    id: string;
    name: string;
    email?: string;
    avatarUrl?: string;
    role: UserRole;
    roles: UserRole[];
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
        roles: this.getHeldRoles(user),
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
        roles: this.getHeldRoles(user),
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
        roles: this.getHeldRoles(user),
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
        roles: this.getHeldRoles(user),
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
        additionalRoles: true,
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
            careerPath: true,
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

    const { additionalRoles, ...rest } = user;
    return {
      ...rest,
      // `role` di sini sengaja peran AKTIF sesi ini (dari token), bukan
      // peran utama di kolom DB - supaya FE tahu sedang "masuk sebagai" apa.
      role: currentUser.role,
      roles: this.getHeldRoles({ role: user.role, additionalRoles }),
    };
  }

  /**
   * Pindah peran aktif untuk user yang sudah memegang lebih dari satu peran
   * (mis. siswa yang juga guru). Menerbitkan access token baru dengan
   * `role`/profil sesuai peran tujuan - pola sama seperti login biasa.
   */
  async switchRole(
    currentUser: AuthenticatedUser,
    dto: SwitchRoleDto,
  ): Promise<AuthResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id: currentUser.id },
      include: { teacherProfile: true, studentProfile: true },
    });

    if (!user) {
      throw new UnauthorizedException("User tidak ditemukan.");
    }

    const heldRoles = this.getHeldRoles(user);
    if (!heldRoles.includes(dto.role)) {
      throw new ForbiddenException("Kamu tidak memiliki peran ini.");
    }

    const schoolId =
      dto.role === UserRole.TEACHER
        ? (user.teacherProfile?.schoolId ?? undefined)
        : dto.role === UserRole.STUDENT
          ? (user.studentProfile?.schoolId ?? undefined)
          : undefined;
    const teacherProfileId = dto.role === UserRole.TEACHER ? user.teacherProfile?.id : undefined;
    const studentProfileId = dto.role === UserRole.STUDENT ? user.studentProfile?.id : undefined;

    return {
      accessToken: await this.signAccessToken({
        sub: user.id,
        role: dto.role,
        schoolId,
        teacherProfileId,
        studentProfileId,
      }),
      user: {
        id: user.id,
        name: user.name,
        email: user.email ?? undefined,
        avatarUrl: user.avatarUrl ?? undefined,
        role: dto.role,
        roles: heldRoles,
        schoolId,
        teacherProfileId,
        studentProfileId,
      },
    };
  }

  /**
   * Menambahkan peran ekstra (STUDENT/TEACHER saja) ke akun sendiri, sekaligus
   * membuat profil terkait bila belum ada. Admin/Super Admin sengaja tidak
   * bisa ditambahkan lewat sini.
   */
  async addRole(currentUser: AuthenticatedUser, dto: AddRoleDto): Promise<{ roles: UserRole[] }> {
    if (!SELF_SERVICE_ROLES.includes(dto.role)) {
      throw new BadRequestException("Peran ini tidak bisa ditambahkan sendiri.");
    }

    const user = await this.prisma.user.findUnique({
      where: { id: currentUser.id },
      include: { teacherProfile: true, studentProfile: true },
    });

    if (!user) {
      throw new UnauthorizedException("User tidak ditemukan.");
    }

    const heldRoles = this.getHeldRoles(user);
    if (heldRoles.includes(dto.role)) {
      throw new ConflictException("Kamu sudah memiliki peran ini.");
    }

    if (dto.role === UserRole.TEACHER && !user.teacherProfile) {
      const schoolId = user.studentProfile?.schoolId;
      if (!schoolId) {
        throw new BadRequestException(
          "Hubungkan akun ke sekolah dahulu sebelum menambah peran Guru.",
        );
      }
      await this.prisma.$transaction(async (tx) => {
        await tx.teacherProfile.create({ data: { userId: user.id, schoolId } });
        await tx.user.update({
          where: { id: user.id },
          data: { additionalRoles: { push: dto.role } },
        });
      });
    } else if (dto.role === UserRole.STUDENT && !user.studentProfile) {
      await this.prisma.$transaction(async (tx) => {
        await tx.studentProfile.create({
          data: {
            userId: user.id,
            fullName: user.name,
            schoolId: user.teacherProfile?.schoolId,
          },
        });
        await tx.user.update({
          where: { id: user.id },
          data: { additionalRoles: { push: dto.role } },
        });
      });
    } else {
      // Profilnya sudah ada (mis. sisa dari akun lama) - tinggal daftarkan perannya.
      await this.prisma.user.update({
        where: { id: user.id },
        data: { additionalRoles: { push: dto.role } },
      });
    }

    return { roles: [...heldRoles, dto.role] };
  }

  private getHeldRoles(user: { role: UserRole; additionalRoles: UserRole[] }): UserRole[] {
    return [...new Set([user.role, ...user.additionalRoles])];
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
