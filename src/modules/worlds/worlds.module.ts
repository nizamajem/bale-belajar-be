import { Module } from "@nestjs/common";
import { CurriculumAdminController } from "./curriculum-admin.controller";
import { CurriculumImportService } from "./curriculum-import.service";
import { WorldsController } from "./worlds.controller";
import { WorldsService } from "./worlds.service";

@Module({
  controllers: [WorldsController, CurriculumAdminController],
  providers: [WorldsService, CurriculumImportService],
  exports: [WorldsService],
})
export class WorldsModule {}
