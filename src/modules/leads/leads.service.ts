import { BadRequestException, Injectable } from "@nestjs/common";
import { LeadStatus } from "@prisma/client";
import { PrismaService } from "../../database/prisma/prisma.service";
import { CreateSchoolLeadDto } from "./dto/create-school-lead.dto";
import { SchoolLead } from "./entities/school-lead.entity";

@Injectable()
export class LeadsService {
  constructor(private readonly prisma: PrismaService) {}

  async createPublicLead(dto: CreateSchoolLeadDto): Promise<SchoolLead> {
    if (dto.website && dto.website.trim().length > 0) {
      throw new BadRequestException("Pengajuan tidak valid.");
    }

    const lead = await this.prisma.schoolLead.create({
      data: {
        schoolName: dto.schoolName,
        contactName: dto.contactName,
        position: dto.position,
        phone: dto.phone,
        email: dto.email,
        studentCount: dto.studentCount,
        message: dto.message,
        source: dto.source ?? "profile",
        status: LeadStatus.NEW,
      },
    });

    return this.mapLead(lead);
  }

  async findAll() {
    const [leads, total] = await this.prisma.$transaction([
      this.prisma.schoolLead.findMany({
        orderBy: {
          createdAt: "desc",
        },
      }),
      this.prisma.schoolLead.count(),
    ]);

    return {
      data: leads.map((lead) => this.mapLead(lead)),
      meta: {
        total,
      },
    };
  }

  private mapLead(lead: {
    id: string;
    schoolName: string;
    contactName: string;
    position: string | null;
    phone: string;
    email: string | null;
    studentCount: number | null;
    message: string | null;
    source: string | null;
    status: LeadStatus;
    createdAt: Date;
    updatedAt: Date;
  }): SchoolLead {
    return {
      id: lead.id,
      schoolName: lead.schoolName,
      contactName: lead.contactName,
      position: lead.position ?? undefined,
      phone: lead.phone,
      email: lead.email ?? undefined,
      studentCount: lead.studentCount ?? undefined,
      message: lead.message ?? undefined,
      source: lead.source ?? undefined,
      status: lead.status,
      createdAt: lead.createdAt.toISOString(),
      updatedAt: lead.updatedAt.toISOString(),
    };
  }
}
