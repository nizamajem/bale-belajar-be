import { Module } from "@nestjs/common";
import { StudentAssessmentsController } from "./student-assessments.controller";
import { StudentAssessmentsService } from "./student-assessments.service";

@Module({
  controllers: [StudentAssessmentsController],
  providers: [StudentAssessmentsService],
})
export class StudentAssessmentsModule {}

