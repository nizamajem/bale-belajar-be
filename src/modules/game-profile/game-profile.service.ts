import { ForbiddenException, Injectable } from "@nestjs/common";
import { AuthenticatedUser } from "../../common/types/authenticated-user.type";
import { ExperienceLedgerService } from "../experience-ledger/experience-ledger.service";

@Injectable()
export class GameProfileService {
  constructor(private readonly experienceLedgerService: ExperienceLedgerService) {}

  async getMyProfile(currentUser: AuthenticatedUser) {
    const studentProfileId = this.getStudentProfileId(currentUser);
    return this.experienceLedgerService.getGameProfileSummary(studentProfileId);
  }

  private getStudentProfileId(currentUser: AuthenticatedUser) {
    if (!currentUser.studentProfileId) {
      throw new ForbiddenException("Akses hanya untuk siswa.");
    }

    return currentUser.studentProfileId;
  }
}
