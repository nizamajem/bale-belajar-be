export type SchoolLeadStatus =
  | "NEW"
  | "CONTACTED"
  | "DEMO_SCHEDULED"
  | "PILOT"
  | "REJECTED"
  | "CONVERTED";

export type SchoolLead = {
  id: string;
  schoolName: string;
  contactName: string;
  position?: string;
  phone: string;
  email?: string;
  studentCount?: number;
  message?: string;
  source?: string;
  status: SchoolLeadStatus;
  createdAt: string;
  updatedAt: string;
};

