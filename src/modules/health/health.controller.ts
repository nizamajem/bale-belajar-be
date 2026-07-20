import { Controller, Get } from "@nestjs/common";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { ResponseMessage } from "../../common/decorators/response-message.decorator";
import { HealthService } from "./health.service";

@ApiTags("Health")
@Controller("health")
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ResponseMessage("API berjalan normal.")
  @ApiOkResponse({
    description: "Status API.",
    example: {
      success: true,
      message: "API berjalan normal.",
      data: {
        status: "ok",
        uptime: 12.4,
      },
    },
  })
  getHealth() {
    return {
      status: "ok",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }

  @Get("database")
  @ResponseMessage("Status database berhasil diambil.")
  @ApiOkResponse({
    description: "Status database sementara sebelum Prisma aktif.",
  })
  async getDatabaseHealth() {
    return this.healthService.getDatabaseHealth();
  }
}
