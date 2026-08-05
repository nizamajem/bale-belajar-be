import { Module } from "@nestjs/common";
import { PrismaModule } from "../../database/prisma/prisma.module";
import { StudentBaleVerseController } from "./student-baleverse.controller";
import { StudentBaleVerseService } from "./student-baleverse.service";

@Module({
  imports: [PrismaModule],
  controllers: [StudentBaleVerseController],
  providers: [StudentBaleVerseService],
})
export class StudentBaleVerseModule {}
