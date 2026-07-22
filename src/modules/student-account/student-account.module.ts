import { Module } from "@nestjs/common";
import { StudentAccountController } from "./student-account.controller";
import { StudentAccountService } from "./student-account.service";

@Module({
  controllers: [StudentAccountController],
  providers: [StudentAccountService],
})
export class StudentAccountModule {}
