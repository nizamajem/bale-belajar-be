import { Module } from "@nestjs/common";
import { PrismaModule } from "../../database/prisma/prisma.module";
import { StudentPlacementController } from "./student-placement.controller";
import { StudentPlacementService } from "./student-placement.service";

@Module({
  imports: [PrismaModule],
  controllers: [StudentPlacementController],
  providers: [StudentPlacementService],
})
export class StudentPlacementModule {}
