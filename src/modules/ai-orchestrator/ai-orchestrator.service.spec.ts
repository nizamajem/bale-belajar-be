import { GuardrailStatus } from "@prisma/client";
import { PrismaService } from "../../database/prisma/prisma.service";
import { AiOrchestratorService } from "./ai-orchestrator.service";
import {
  ContentProviderResult,
  IContentProvider,
  MissionNarrativeContext,
} from "./interfaces/content-provider.interface";

const context: MissionNarrativeContext = {
  missionTitle: "Perbaiki Jembatan Persamaan",
  narrativeTemplate: "Jembatan retak!",
  worldName: "Numeria",
  competencyName: "Persamaan Linear",
  studentName: "Dimas",
};

type LoggedAiInteraction = {
  data: { guardrailStatus: GuardrailStatus };
};

function createFakePrisma() {
  const create = jest
    .fn<Promise<Record<string, unknown>>, [LoggedAiInteraction]>()
    .mockResolvedValue({});
  const prisma = {
    aiInteractionLog: { create },
  } as unknown as PrismaService;

  const getLoggedGuardrailStatus = (): GuardrailStatus | undefined =>
    create.mock.calls[0]?.[0]?.data.guardrailStatus;

  return { prisma, getLoggedGuardrailStatus };
}

describe("AiOrchestratorService", () => {
  it("returns provider text and logs a PASSED guardrail status on success", async () => {
    const provider: IContentProvider = {
      generateMissionNarrative: jest
        .fn()
        .mockResolvedValue({ text: "Narasi normal." } satisfies ContentProviderResult),
    };
    const { prisma, getLoggedGuardrailStatus } = createFakePrisma();
    const service = new AiOrchestratorService(provider, prisma);

    const text = await service.generateMissionNarrative("student-1", context);

    expect(text).toBe("Narasi normal.");
    expect(getLoggedGuardrailStatus()).toBe(GuardrailStatus.PASSED);
  });

  it("falls back to a template and logs FALLBACK when the provider returns empty text", async () => {
    const provider: IContentProvider = {
      generateMissionNarrative: jest.fn().mockResolvedValue({ text: "   " }),
    };
    const { prisma, getLoggedGuardrailStatus } = createFakePrisma();
    const service = new AiOrchestratorService(provider, prisma);

    const text = await service.generateMissionNarrative("student-1", context);

    expect(text).toContain(context.missionTitle);
    expect(getLoggedGuardrailStatus()).toBe(GuardrailStatus.FALLBACK);
  });

  it("falls back to a template and logs BLOCKED when the provider throws", async () => {
    const provider: IContentProvider = {
      generateMissionNarrative: jest
        .fn()
        .mockRejectedValue(new Error("provider down")),
    };
    const { prisma, getLoggedGuardrailStatus } = createFakePrisma();
    const service = new AiOrchestratorService(provider, prisma);

    const text = await service.generateMissionNarrative("student-1", context);

    expect(text).toContain(context.missionTitle);
    expect(getLoggedGuardrailStatus()).toBe(GuardrailStatus.BLOCKED);
  });

  it("truncates narratives that exceed the guardrail length limit", async () => {
    const longText = "a".repeat(1000);
    const provider: IContentProvider = {
      generateMissionNarrative: jest.fn().mockResolvedValue({ text: longText }),
    };
    const { prisma } = createFakePrisma();
    const service = new AiOrchestratorService(provider, prisma);

    const text = await service.generateMissionNarrative("student-1", context);

    expect(text.length).toBe(600);
  });
});
