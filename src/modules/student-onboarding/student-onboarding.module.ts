import { Module } from "@nestjs/common";
import { PrismaModule } from "../../database/prisma/prisma.module";
import { StudentOnboardingController } from "./student-onboarding.controller";
import { StudentOnboardingService } from "./student-onboarding.service";

@Module({
  imports: [PrismaModule],
  controllers: [StudentOnboardingController],
  providers: [StudentOnboardingService],
})
export class StudentOnboardingModule {}
