import { Module } from "@nestjs/common";
import { ExperienceLedgerModule } from "../experience-ledger/experience-ledger.module";
import { MasteryModule } from "../mastery/mastery.module";
import { StudentQuestsController } from "./student-quests.controller";
import { StudentQuestsService } from "./student-quests.service";

@Module({
  imports: [ExperienceLedgerModule, MasteryModule],
  controllers: [StudentQuestsController],
  providers: [StudentQuestsService],
})
export class StudentQuestsModule {}
