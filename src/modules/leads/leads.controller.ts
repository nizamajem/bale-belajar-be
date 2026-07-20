import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { Roles } from "../../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { ResponseMessage } from "../../common/decorators/response-message.decorator";
import { CreateSchoolLeadDto } from "./dto/create-school-lead.dto";
import { LeadsService } from "./leads.service";

@ApiTags("Leads")
@Controller()
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Post("public/leads")
  @ResponseMessage(
    "Terima kasih. Tim BaleBelajar akan menghubungi Anda untuk mendiskusikan pilot sekolah.",
  )
  @ApiCreatedResponse({
    description: "Lead pilot berhasil diterima.",
  })
  createPublicLead(@Body() dto: CreateSchoolLeadDto) {
    return this.leadsService.createPublicLead(dto);
  }

  @Get("leads")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiBearerAuth()
  @ResponseMessage("Data leads berhasil diambil.")
  @ApiOkResponse({
    description: "Daftar leads pilot.",
  })
  findAll() {
    return this.leadsService.findAll();
  }
}
