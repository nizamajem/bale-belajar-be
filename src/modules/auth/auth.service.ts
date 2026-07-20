import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService, JwtSignOptions } from "@nestjs/jwt";
import { UserRole, UserStatus } from "@prisma/client";
import * as bcrypt from "bcrypt";
import { PrismaService } from "../../database/prisma/prisma.service";
import { AuthenticatedUser } from "../../common/types/authenticated-user.type";
import { LoginDto } from "./dto/login.dto";
import { StudentLoginDto } from "./dto/student-login.dto";
import { AuthTokenPayload } from "./types/auth-token-payload.type";

type AuthResponse = {
  accessToken: string;
  user: {
    id: string;
    name: string;
    email?: string;
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
        schoolId: student.schoolId,
        studentProfileId: student.id,
      }),
      user: {
        id: user.id,
        name: student.fullName,
        role: UserRole.STUDENT,
        schoolId: student.schoolId,
        studentProfileId: student.id,
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
