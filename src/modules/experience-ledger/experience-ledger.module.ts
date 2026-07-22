import { Module } from "@nestjs/common";
import { ExperienceLedgerService } from "./experience-ledger.service";

@Module({
  providers: [ExperienceLedgerService],
  exports: [ExperienceLedgerService],
})
export class ExperienceLedgerModule {}
