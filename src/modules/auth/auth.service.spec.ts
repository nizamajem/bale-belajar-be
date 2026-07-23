import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { UserRole, UserStatus } from "@prisma/client";
import * as bcrypt from "bcrypt";
import { PrismaService } from "../../database/prisma/prisma.service";
import { AuthService } from "./auth.service";

const verifyIdTokenMock = jest.fn();

jest.mock("firebase-admin/app", () => ({
  getApps: jest.fn(() => [{}]),
  initializeApp: jest.fn(),
  cert: jest.fn(),
}));

jest.mock("firebase-admin/auth", () => ({
  getAuth: jest.fn(() => ({ verifyIdToken: verifyIdTokenMock })),
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
  passwordHash: string | null;
  firebaseUid: string | null;
  avatarUrl: string | null;
  role: UserRole;
  additionalRoles: UserRole[];
  status: UserStatus;
  teacherProfile: { id: string; schoolId: string } | null;
  studentProfile: { id: string; schoolId: string | null } | null;
};

function createFakePrisma(options: { existingUsers?: FakeUser[] } = {}) {
  const users = new Map<string, FakeUser>(
    (options.existingUsers ?? []).map((user) => [user.id, user]),
  );
  let nextId = 1;

  const findUser = (where: { firebaseUid?: string; email?: string; id?: string }) =>
    [...users.values()].find(
      (user) =>
        (where.firebaseUid !== undefined && user.firebaseUid === where.firebaseUid) ||
        (where.email !== undefined && user.email === where.email) ||
        (where.id !== undefined && user.id === where.id),
    ) ?? null;

  const userDelegate = {
    findFirst: jest.fn(
      (args: { where: { firebaseUid?: string; email?: string; deletedAt?: null; status?: UserStatus } }) =>
        Promise.resolve(findUser(args.where)),
    ),
    findUnique: jest.fn((args: { where: { id: string } }) =>
      Promise.resolve(findUser({ id: args.where.id })),
    ),
    findUniqueOrThrow: jest.fn((args: { where: { id: string } }) => {
      const user = findUser({ id: args.where.id });
      if (!user) throw new Error("not found");
      return Promise.resolve(user);
    }),
    update: jest.fn(
      (args: {
        where: { id: string };
        data: Partial<Omit<FakeUser, "additionalRoles">> & {
          additionalRoles?: UserRole[] | { push: UserRole };
        };
      }) => {
        const user = findUser({ id: args.where.id });
        if (!user) throw new Error("not found");
        const { additionalRoles, ...rest } = args.data;
        Object.assign(user, rest);
        if (additionalRoles !== undefined) {
          user.additionalRoles = Array.isArray(additionalRoles)
            ? additionalRoles
            : [...user.additionalRoles, additionalRoles.push];
        }
        return Promise.resolve(user);
      },
    ),
    create: jest.fn((args: { data: Partial<FakeUser> }) => {
      const id = `user-${nextId++}`;
      const created: FakeUser = {
        id,
        name: args.data.name ?? "",
        email: args.data.email ?? null,
        passwordHash: args.data.passwordHash ?? null,
        firebaseUid: args.data.firebaseUid ?? null,
        avatarUrl: args.data.avatarUrl ?? null,
        role: args.data.role ?? UserRole.STUDENT,
        additionalRoles: args.data.additionalRoles ?? [],
        status: args.data.status ?? UserStatus.ACTIVE,
        teacherProfile: null,
        studentProfile: null,
      };
      users.set(id, created);
      return Promise.resolve(created);
    }),
  };

  const studentProfileDelegate = {
    create: jest.fn(
      (args: { data: { userId: string; fullName: string; schoolId?: string; gradeLevel?: number } }) => {
        const user = findUser({ id: args.data.userId });
        const profile = { id: `sp-${args.data.userId}`, schoolId: args.data.schoolId ?? null };
        if (user) user.studentProfile = profile;
        return Promise.resolve(profile);
      },
    ),
  };

  const teacherProfileDelegate = {
    create: jest.fn((args: { data: { userId: string; schoolId: string } }) => {
      const user = findUser({ id: args.data.userId });
      const profile = { id: `tp-${args.data.userId}`, schoolId: args.data.schoolId };
      if (user) user.teacherProfile = profile;
      return Promise.resolve(profile);
    }),
  };

  const prisma = {
    user: userDelegate,
    studentProfile: studentProfileDelegate,
    teacherProfile: teacherProfileDelegate,
    $transaction: jest.fn((callback: (tx: unknown) => unknown) =>
      callback({
        user: userDelegate,
        studentProfile: studentProfileDelegate,
        teacherProfile: teacherProfileDelegate,
      }),
    ),
  } as unknown as PrismaService;

  return { prisma, users };
}

const validPayload = {
  uid: "firebase-uid-1",
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
    verifyIdTokenMock.mockResolvedValue(validPayload);
    const { prisma, users } = createFakePrisma();
    const service = new AuthService(createFakeConfigService(), createFakeJwtService(), prisma);

    const result = await service.loginWithGoogle({ idToken: "token" });

    expect(result.isNewUser).toBe(true);
    expect(result.user.role).toBe(UserRole.STUDENT);
    expect(result.user.studentProfileId).toBeDefined();
    expect(users.size).toBe(1);
    expect([...users.values()][0].studentProfile).not.toBeNull();
  });

  it("logs in directly when a user already has this firebaseUid", async () => {
    verifyIdTokenMock.mockResolvedValue(validPayload);
    const existing: FakeUser = {
      id: "user-existing",
      name: "Siswa Lama",
      email: "siswa@example.com",
      passwordHash: null,
      firebaseUid: "firebase-uid-1",
      avatarUrl: null,
      role: UserRole.STUDENT,
      additionalRoles: [],
      status: UserStatus.ACTIVE,
      teacherProfile: null,
      studentProfile: { id: "sp-existing", schoolId: "school-1" },
    };
    const { prisma } = createFakePrisma({ existingUsers: [existing] });
    const service = new AuthService(createFakeConfigService(), createFakeJwtService(), prisma);

    const result = await service.loginWithGoogle({ idToken: "token" });

    expect(result.isNewUser).toBe(false);
    expect(result.user.id).toBe("user-existing");
    expect(result.user.schoolId).toBe("school-1");
  });

  it("links firebaseUid to an existing account found by email", async () => {
    verifyIdTokenMock.mockResolvedValue(validPayload);
    const existing: FakeUser = {
      id: "user-email-match",
      name: "Siswa Email",
      email: "siswa@example.com",
      passwordHash: null,
      firebaseUid: null,
      avatarUrl: null,
      role: UserRole.STUDENT,
      additionalRoles: [],
      status: UserStatus.ACTIVE,
      teacherProfile: null,
      studentProfile: { id: "sp-email-match", schoolId: null },
    };
    const { prisma, users } = createFakePrisma({ existingUsers: [existing] });
    const service = new AuthService(createFakeConfigService(), createFakeJwtService(), prisma);

    const result = await service.loginWithGoogle({ idToken: "token" });

    expect(result.isNewUser).toBe(false);
    expect(users.get("user-email-match")?.firebaseUid).toBe("firebase-uid-1");
  });

  it("rejects when the Google email is not verified", async () => {
    verifyIdTokenMock.mockResolvedValue({ ...validPayload, email_verified: false });
    const { prisma } = createFakePrisma();
    const service = new AuthService(createFakeConfigService(), createFakeJwtService(), prisma);

    await expect(service.loginWithGoogle({ idToken: "token" })).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it("rejects when the Firebase token fails verification", async () => {
    verifyIdTokenMock.mockRejectedValue(new Error("invalid token"));
    const { prisma } = createFakePrisma();
    const service = new AuthService(createFakeConfigService(), createFakeJwtService(), prisma);

    await expect(service.loginWithGoogle({ idToken: "bad-token" })).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});

describe("AuthService.registerStudent", () => {
  it("creates a STUDENT user + StudentProfile with a hashed password", async () => {
    const { prisma, users } = createFakePrisma();
    const service = new AuthService(createFakeConfigService(), createFakeJwtService(), prisma);

    const result = await service.registerStudent({
      name: "Dimas Aditya",
      email: "Dimas@Example.com",
      password: "SandiKuat123!",
      gradeLevel: 10,
    });

    expect(result.user.role).toBe(UserRole.STUDENT);
    expect(result.user.studentProfileId).toBeDefined();
    const created = [...users.values()][0];
    expect(created.email).toBe("dimas@example.com");
    expect(created.passwordHash).not.toBe("SandiKuat123!");
    expect(await bcrypt.compare("SandiKuat123!", created.passwordHash!)).toBe(true);
  });

  it("rejects registration when the email is already used", async () => {
    const existing: FakeUser = {
      id: "user-existing",
      name: "Sudah Ada",
      email: "dimas@example.com",
      passwordHash: "hash",
      firebaseUid: null,
      avatarUrl: null,
      role: UserRole.STUDENT,
      additionalRoles: [],
      status: UserStatus.ACTIVE,
      teacherProfile: null,
      studentProfile: null,
    };
    const { prisma } = createFakePrisma({ existingUsers: [existing] });
    const service = new AuthService(createFakeConfigService(), createFakeJwtService(), prisma);

    await expect(
      service.registerStudent({
        name: "Dimas Aditya",
        email: "dimas@example.com",
        password: "SandiKuat123!",
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});

describe("AuthService.login", () => {
  it("includes studentProfileId in the token/response for a student account", async () => {
    const passwordHash = await bcrypt.hash("SandiKuat123!", 4);
    const existing: FakeUser = {
      id: "user-student",
      name: "Siswa Email",
      email: "siswa@example.com",
      passwordHash,
      firebaseUid: null,
      avatarUrl: null,
      role: UserRole.STUDENT,
      additionalRoles: [],
      status: UserStatus.ACTIVE,
      teacherProfile: null,
      studentProfile: { id: "sp-1", schoolId: "school-1" },
    };
    const { prisma } = createFakePrisma({ existingUsers: [existing] });
    const service = new AuthService(createFakeConfigService(), createFakeJwtService(), prisma);

    const result = await service.login({
      email: "siswa@example.com",
      password: "SandiKuat123!",
    });

    expect(result.user.studentProfileId).toBe("sp-1");
    expect(result.user.schoolId).toBe("school-1");
  });

  it("rejects an incorrect password", async () => {
    const passwordHash = await bcrypt.hash("SandiKuat123!", 4);
    const existing: FakeUser = {
      id: "user-student",
      name: "Siswa Email",
      email: "siswa@example.com",
      passwordHash,
      firebaseUid: null,
      avatarUrl: null,
      role: UserRole.STUDENT,
      additionalRoles: [],
      status: UserStatus.ACTIVE,
      teacherProfile: null,
      studentProfile: null,
    };
    const { prisma } = createFakePrisma({ existingUsers: [existing] });
    const service = new AuthService(createFakeConfigService(), createFakeJwtService(), prisma);

    await expect(
      service.login({ email: "siswa@example.com", password: "salah" }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});

function multiRoleUser(overrides: Partial<FakeUser> = {}): FakeUser {
  return {
    id: "user-multi",
    name: "Siswa Guru",
    email: "siswa-guru@example.com",
    passwordHash: null,
    firebaseUid: null,
    avatarUrl: null,
    role: UserRole.STUDENT,
    additionalRoles: [UserRole.TEACHER],
    status: UserStatus.ACTIVE,
    teacherProfile: { id: "tp-1", schoolId: "school-1" },
    studentProfile: { id: "sp-1", schoolId: "school-1" },
    ...overrides,
  };
}

describe("AuthService.switchRole", () => {
  it("issues a token scoped to the target role when the user holds it", async () => {
    const { prisma } = createFakePrisma({ existingUsers: [multiRoleUser()] });
    const service = new AuthService(createFakeConfigService(), createFakeJwtService(), prisma);

    const result = await service.switchRole(
      { id: "user-multi", role: UserRole.STUDENT },
      { role: UserRole.TEACHER },
    );

    expect(result.user.role).toBe(UserRole.TEACHER);
    expect(result.user.teacherProfileId).toBe("tp-1");
    expect(result.user.studentProfileId).toBeUndefined();
  });

  it("rejects switching to a role the user does not hold", async () => {
    const { prisma } = createFakePrisma({
      existingUsers: [multiRoleUser({ additionalRoles: [] })],
    });
    const service = new AuthService(createFakeConfigService(), createFakeJwtService(), prisma);

    await expect(
      service.switchRole(
        { id: "user-multi", role: UserRole.STUDENT },
        { role: UserRole.TEACHER },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});

describe("AuthService.addRole", () => {
  it("grants TEACHER and creates a TeacherProfile when the student already has a school", async () => {
    const existing = multiRoleUser({
      additionalRoles: [],
      teacherProfile: null,
      studentProfile: { id: "sp-1", schoolId: "school-1" },
    });
    const { prisma, users } = createFakePrisma({ existingUsers: [existing] });
    const service = new AuthService(createFakeConfigService(), createFakeJwtService(), prisma);

    const result = await service.addRole(
      { id: "user-multi", role: UserRole.STUDENT },
      { role: UserRole.TEACHER },
    );

    expect(result.roles).toEqual([UserRole.STUDENT, UserRole.TEACHER]);
    expect(users.get("user-multi")?.teacherProfile).not.toBeNull();
    expect(users.get("user-multi")?.additionalRoles).toContain(UserRole.TEACHER);
  });

  it("rejects adding TEACHER when the account has no school connected", async () => {
    const existing = multiRoleUser({
      additionalRoles: [],
      teacherProfile: null,
      studentProfile: { id: "sp-1", schoolId: null },
    });
    const { prisma } = createFakePrisma({ existingUsers: [existing] });
    const service = new AuthService(createFakeConfigService(), createFakeJwtService(), prisma);

    await expect(
      service.addRole({ id: "user-multi", role: UserRole.STUDENT }, { role: UserRole.TEACHER }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("rejects adding a role the user already holds", async () => {
    const { prisma } = createFakePrisma({ existingUsers: [multiRoleUser()] });
    const service = new AuthService(createFakeConfigService(), createFakeJwtService(), prisma);

    await expect(
      service.addRole({ id: "user-multi", role: UserRole.STUDENT }, { role: UserRole.TEACHER }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it("rejects adding an admin-tier role via self-service", async () => {
    const { prisma } = createFakePrisma({ existingUsers: [multiRoleUser()] });
    const service = new AuthService(createFakeConfigService(), createFakeJwtService(), prisma);

    await expect(
      service.addRole({ id: "user-multi", role: UserRole.STUDENT }, { role: UserRole.ADMIN }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
