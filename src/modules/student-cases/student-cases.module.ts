import { Module } from "@nestjs/common";
import { ExperienceLedgerModule } from "../experience-ledger/experience-ledger.module";
import { MasteryModule } from "../mastery/mastery.module";
import { StudentCasesController } from "./student-cases.controller";
import { StudentCasesService } from "./student-cases.service";

@Module({
  imports: [ExperienceLedgerModule, MasteryModule],
  controllers: [StudentCasesController],
  providers: [StudentCasesService],
})
export class StudentCasesModule {}
