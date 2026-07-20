import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PrismaModule } from "./database/prisma/prisma.module";
import { AuthModule } from "./modules/auth/auth.module";
import { AssessmentsModule } from "./modules/assessments/assessments.module";
import { ClassroomsModule } from "./modules/classrooms/classrooms.module";
import { CompetenciesModule } from "./modules/competencies/competencies.module";
import { HealthModule } from "./modules/health/health.module";
import { LeadsModule } from "./modules/leads/leads.module";
import { QuestionsModule } from "./modules/questions/questions.module";
import { SchoolsModule } from "./modules/schools/schools.module";
import { StudentsModule } from "./modules/students/students.module";
import { StudentAssessmentsModule } from "./modules/student-assessments/student-assessments.module";
import { SubjectsModule } from "./modules/subjects/subjects.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule,
    AssessmentsModule,
    HealthModule,
    LeadsModule,
    SchoolsModule,
    StudentsModule,
    ClassroomsModule,
    SubjectsModule,
    CompetenciesModule,
    QuestionsModule,
    StudentAssessmentsModule,
  ],
})
export class AppModule {}
