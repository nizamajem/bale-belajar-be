import { Inject, Injectable, Logger } from "@nestjs/common";
import { AiFeature, GuardrailStatus } from "@prisma/client";
import { PrismaService } from "../../database/prisma/prisma.service";
import {
  CONTENT_PROVIDER,
  IContentProvider,
  MissionNarrativeContext,
} from "./interfaces/content-provider.interface";
import { RULE_BASED_PROVIDER_NAME } from "./providers/rule-based-content.provider";

const MAX_NARRATIVE_LENGTH = 600;
const PROMPT_VERSION = "mission-narrative-v1";

@Injectable()
export class AiOrchestratorService {
  private readonly logger = new Logger(AiOrchestratorService.name);

  constructor(
    @Inject(CONTENT_PROVIDER) private readonly provider: IContentProvider,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Menghasilkan narasi misi lewat provider konten, tapi selalu melewati
   * guardrail (panjang teks, non-kosong) dan fallback template sebelum hasil
   * dikembalikan. Semua panggilan dicatat ke AiInteractionLog untuk audit
   * biaya/latency/kegagalan (blueprint §6.5).
   */
  async generateMissionNarrative(
    studentProfileId: string,
    context: MissionNarrativeContext,
  ): Promise<string> {
    const startedAt = Date.now();
    let guardrailStatus: GuardrailStatus = GuardrailStatus.PASSED;
    let text: string;

    try {
      const result = await this.provider.generateMissionNarrative(context);
      const guarded = this.applyGuardrail(result.text);

      if (guarded === null) {
        text = this.buildFallbackNarrative(context);
        guardrailStatus = GuardrailStatus.FALLBACK;
      } else {
        text = guarded;
      }
    } catch (error) {
      this.logger.warn(
        `Content provider gagal, memakai fallback: ${(error as Error).message}`,
      );
      text = this.buildFallbackNarrative(context);
      guardrailStatus = GuardrailStatus.BLOCKED;
    }

    const latencyMs = Date.now() - startedAt;

    await this.prisma.aiInteractionLog.create({
      data: {
        studentProfileId,
        feature: AiFeature.MISSION_NARRATIVE,
        provider: RULE_BASED_PROVIDER_NAME,
        promptVersion: PROMPT_VERSION,
        requestSummary: {
          missionTitle: context.missionTitle,
          worldName: context.worldName,
          competencyName: context.competencyName,
        },
        responseSummary: { textLength: text.length },
        guardrailStatus,
        latencyMs,
      },
    });

    return text;
  }

  private applyGuardrail(text: string): string | null {
    const trimmed = text.trim();

    if (trimmed.length === 0) {
      return null;
    }

    return trimmed.length > MAX_NARRATIVE_LENGTH
      ? trimmed.slice(0, MAX_NARRATIVE_LENGTH)
      : trimmed;
  }

  private buildFallbackNarrative(context: MissionNarrativeContext): string {
    return `Misi hari ini: ${context.missionTitle}. Selesaikan aktivitas berikut untuk melatih ${context.competencyName}.`;
  }
}
