import { Module } from "@nestjs/common";
import { AiOrchestratorModule } from "../ai-orchestrator/ai-orchestrator.module";
import { ExperienceLedgerModule } from "../experience-ledger/experience-ledger.module";
import { MasteryModule } from "../mastery/mastery.module";
import { StudentMissionsController } from "./student-missions.controller";
import { StudentMissionsService } from "./student-missions.service";

@Module({
  imports: [ExperienceLedgerModule, MasteryModule, AiOrchestratorModule],
  controllers: [StudentMissionsController],
  providers: [StudentMissionsService],
})
export class StudentMissionsModule {}
