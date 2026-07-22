import { Module } from "@nestjs/common";
import { AiOrchestratorService } from "./ai-orchestrator.service";
import { CONTENT_PROVIDER } from "./interfaces/content-provider.interface";
import { RuleBasedContentProvider } from "./providers/rule-based-content.provider";

@Module({
  providers: [
    AiOrchestratorService,
    RuleBasedContentProvider,
    {
      provide: CONTENT_PROVIDER,
      useExisting: RuleBasedContentProvider,
    },
  ],
  exports: [AiOrchestratorService],
})
export class AiOrchestratorModule {}
