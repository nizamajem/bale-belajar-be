import { Module } from "@nestjs/common";
import { AdminVocabController } from "./admin-vocab.controller";
import { StudentVocabController } from "./student-vocab.controller";
import { VocabService } from "./vocab.service";

@Module({
  controllers: [StudentVocabController, AdminVocabController],
  providers: [VocabService],
})
export class VocabModule {}
