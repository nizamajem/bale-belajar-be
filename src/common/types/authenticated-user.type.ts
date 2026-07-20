import { UserRole } from "@prisma/client";

export type AuthenticatedUser = {
  id: string;
  role: UserRole;
  schoolId?: string;
  teacherProfileId?: string;
  studentProfileId?: string;
};

