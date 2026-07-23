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
import { AiOrchestratorModule } from "./modules/ai-orchestrator/ai-orchestrator.module";
import { ExperienceLedgerModule } from "./modules/experience-ledger/experience-ledger.module";
import { GameProfileModule } from "./modules/game-profile/game-profile.module";
import { MasteryModule } from "./modules/mastery/mastery.module";
import { StudentMissionsModule } from "./modules/student-missions/student-missions.module";
import { StudentAccountModule } from "./modules/student-account/student-account.module";
import { StudentCasesModule } from "./modules/student-cases/student-cases.module";
import { WorldsModule } from "./modules/worlds/worlds.module";

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
    ExperienceLedgerModule,
    GameProfileModule,
    WorldsModule,
    MasteryModule,
    AiOrchestratorModule,
    StudentMissionsModule,
    StudentAccountModule,
    StudentCasesModule,
  ],
})
export class AppModule {}
