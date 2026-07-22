import { UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { UserRole, UserStatus } from "@prisma/client";
import { PrismaService } from "../../database/prisma/prisma.service";
import { AuthService } from "./auth.service";

const verifyIdTokenMock = jest.fn();

jest.mock("google-auth-library", () => ({
  OAuth2Client: jest.fn().mockImplementation(() => ({
    verifyIdToken: verifyIdTokenMock,
  })),
}));

function createFakeConfigService(): ConfigService {
  const get = jest.fn(
    (_key: string, fallback?: unknown) => fallback,
  ) as unknown as ConfigService["get"];

  return { get } as unknown as ConfigService;
}

function createFakeJwtService(): JwtService {
  const signAsync = jest.fn().mockResolvedValue("signed-jwt");
  return { signAsync } as unknown as JwtService;
}

type FakeUser = {
  id: string;
  name: string;
  email: string | null;
  googleId: string | null;
  avatarUrl: string | null;
  role: UserRole;
  status: UserStatus;
  studentProfile: { id: string; schoolId: string | null } | null;
};

function createFakePrisma(options: { existingUsers?: FakeUser[] } = {}) {
  const users = new Map<string, FakeUser>(
    (options.existingUsers ?? []).map((user) => [user.id, user]),
  );
  let nextId = 1;

  const findUser = (where: { googleId?: string; email?: string; id?: string }) =>
    [...users.values()].find(
      (user) =>
        (where.googleId !== undefined && user.googleId === where.googleId) ||
        (where.email !== undefined && user.email === where.email) ||
        (where.id !== undefined && user.id === where.id),
    ) ?? null;

  const userDelegate = {
    findFirst: jest.fn((args: { where: { googleId?: string; email?: string } }) =>
      Promise.resolve(findUser(args.where)),
    ),
    findUniqueOrThrow: jest.fn((args: { where: { id: string } }) => {
      const user = findUser({ id: args.where.id });
      if (!user) throw new Error("not found");
      return Promise.resolve(user);
    }),
    update: jest.fn((args: { where: { id: string }; data: Partial<FakeUser> }) => {
      const user = findUser({ id: args.where.id });
      if (!user) throw new Error("not found");
      Object.assign(user, args.data);
      return Promise.resolve(user);
    }),
    create: jest.fn((args: { data: Partial<FakeUser> }) => {
      const id = `user-${nextId++}`;
      const created: FakeUser = {
        id,
        name: args.data.name ?? "",
        email: args.data.email ?? null,
        googleId: args.data.googleId ?? null,
        avatarUrl: args.data.avatarUrl ?? null,
        role: args.data.role ?? UserRole.STUDENT,
        status: args.data.status ?? UserStatus.ACTIVE,
        studentProfile: null,
      };
      users.set(id, created);
      return Promise.resolve(created);
    }),
  };

  const studentProfileDelegate = {
    create: jest.fn((args: { data: { userId: string; fullName: string } }) => {
      const user = findUser({ id: args.data.userId });
      const profile = { id: `sp-${args.data.userId}`, schoolId: null };
      if (user) user.studentProfile = profile;
      return Promise.resolve(profile);
    }),
  };

  const prisma = {
    user: userDelegate,
    studentProfile: studentProfileDelegate,
    $transaction: jest.fn((callback: (tx: unknown) => unknown) =>
      callback({ user: userDelegate, studentProfile: studentProfileDelegate }),
    ),
  } as unknown as PrismaService;

  return { prisma, users };
}

const validPayload = {
  sub: "google-sub-1",
  email: "siswa@example.com",
  name: "Siswa Baru",
  picture: "https://example.com/avatar.png",
  email_verified: true,
};

describe("AuthService.loginWithGoogle", () => {
  beforeEach(() => {
    verifyIdTokenMock.mockReset();
  });

  it("creates a new STUDENT user + StudentProfile when no account matches", async () => {
    verifyIdTokenMock.mockResolvedValue({ getPayload: () => validPayload });
    const { prisma, users } = createFakePrisma();
    const service = new AuthService(createFakeConfigService(), createFakeJwtService(), prisma);

    const result = await service.loginWithGoogle({ idToken: "token" });

    expect(result.isNewUser).toBe(true);
    expect(result.user.role).toBe(UserRole.STUDENT);
    expect(result.user.studentProfileId).toBeDefined();
    expect(users.size).toBe(1);
    expect([...users.values()][0].studentProfile).not.toBeNull();
  });

  it("logs in directly when a user already has this googleId", async () => {
    verifyIdTokenMock.mockResolvedValue({ getPayload: () => validPayload });
    const existing: FakeUser = {
      id: "user-existing",
      name: "Siswa Lama",
      email: "siswa@example.com",
      googleId: "google-sub-1",
      avatarUrl: null,
      role: UserRole.STUDENT,
      status: UserStatus.ACTIVE,
      studentProfile: { id: "sp-existing", schoolId: "school-1" },
    };
    const { prisma } = createFakePrisma({ existingUsers: [existing] });
    const service = new AuthService(createFakeConfigService(), createFakeJwtService(), prisma);

    const result = await service.loginWithGoogle({ idToken: "token" });

    expect(result.isNewUser).toBe(false);
    expect(result.user.id).toBe("user-existing");
    expect(result.user.schoolId).toBe("school-1");
  });

  it("links googleId to an existing account found by email", async () => {
    verifyIdTokenMock.mockResolvedValue({ getPayload: () => validPayload });
    const existing: FakeUser = {
      id: "user-email-match",
      name: "Siswa Email",
      email: "siswa@example.com",
      googleId: null,
      avatarUrl: null,
      role: UserRole.STUDENT,
      status: UserStatus.ACTIVE,
      studentProfile: { id: "sp-email-match", schoolId: null },
    };
    const { prisma, users } = createFakePrisma({ existingUsers: [existing] });
    const service = new AuthService(createFakeConfigService(), createFakeJwtService(), prisma);

    const result = await service.loginWithGoogle({ idToken: "token" });

    expect(result.isNewUser).toBe(false);
    expect(users.get("user-email-match")?.googleId).toBe("google-sub-1");
  });

  it("rejects when the Google email is not verified", async () => {
    verifyIdTokenMock.mockResolvedValue({
      getPayload: () => ({ ...validPayload, email_verified: false }),
    });
    const { prisma } = createFakePrisma();
    const service = new AuthService(createFakeConfigService(), createFakeJwtService(), prisma);

    await expect(service.loginWithGoogle({ idToken: "token" })).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it("rejects when the Google token fails verification", async () => {
    verifyIdTokenMock.mockRejectedValue(new Error("invalid token"));
    const { prisma } = createFakePrisma();
    const service = new AuthService(createFakeConfigService(), createFakeJwtService(), prisma);

    await expect(service.loginWithGoogle({ idToken: "bad-token" })).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
