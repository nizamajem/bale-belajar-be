import { Injectable } from "@nestjs/common";
import {
  ContentProviderResult,
  IContentProvider,
  MissionNarrativeContext,
} from "../interfaces/content-provider.interface";

export const RULE_BASED_PROVIDER_NAME = "rule_based_template_v1";

/**
 * Implementasi v1 BaleBrain: template Indonesia yang dipersonalisasi secara
 * deterministik (tanpa panggilan LLM). Provider lain (mis. LLM asli) dapat
 * mengimplementasikan interface yang sama tanpa mengubah AiOrchestratorService
 * atau kode pemanggilnya.
 */
@Injectable()
export class RuleBasedContentProvider implements IContentProvider {
  generateMissionNarrative(
    context: MissionNarrativeContext,
  ): Promise<ContentProviderResult> {
    const text = `${context.narrativeTemplate} Ayo, ${context.studentName}, buktikan pemahamanmu tentang ${context.competencyName} di dunia ${context.worldName}!`;

    return Promise.resolve({ text });
  }
}
