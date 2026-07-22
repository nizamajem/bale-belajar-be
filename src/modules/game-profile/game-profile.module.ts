import { Module } from "@nestjs/common";
import { ExperienceLedgerModule } from "../experience-ledger/experience-ledger.module";
import { GameProfileController } from "./game-profile.controller";
import { GameProfileService } from "./game-profile.service";

@Module({
  imports: [ExperienceLedgerModule],
  controllers: [GameProfileController],
  providers: [GameProfileService],
})
export class GameProfileModule {}
