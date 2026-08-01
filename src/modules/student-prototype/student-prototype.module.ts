import { Module } from "@nestjs/common";
import { PrismaModule } from "../../database/prisma/prisma.module";
import { StudentPrototypeController } from "./student-prototype.controller";
import { StudentPrototypeService } from "./student-prototype.service";

@Module({
  imports: [PrismaModule],
  controllers: [StudentPrototypeController],
  providers: [StudentPrototypeService],
})
export class StudentPrototypeModule {}
