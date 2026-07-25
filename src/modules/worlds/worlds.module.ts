import { Module } from "@nestjs/common";
import { CurriculumAdminController } from "./curriculum-admin.controller";
import { WorldsController } from "./worlds.controller";
import { WorldsService } from "./worlds.service";

@Module({
  controllers: [WorldsController, CurriculumAdminController],
  providers: [WorldsService],
  exports: [WorldsService],
})
export class WorldsModule {}
