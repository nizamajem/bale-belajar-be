import { UserRole } from "@prisma/client";

export type AuthTokenPayload = {
  sub: string;
  role: UserRole;
  schoolId?: string;
  teacherProfileId?: string;
  studentProfileId?: string;
};

