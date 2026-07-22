export type MissionNarrativeContext = {
  missionTitle: string;
  narrativeTemplate: string;
  worldName: string;
  competencyName: string;
  studentName: string;
};

export type ContentProviderResult = {
  text: string;
};

/**
 * Kontrak BaleBrain untuk konten naratif/hint. Implementasi ini TIDAK PERNAH
 * boleh menentukan benar/salah jawaban atau skor akademik — itu tugas
 * MissionEvaluationService/MasteryService yang deterministik.
 */
export interface IContentProvider {
  generateMissionNarrative(
    context: MissionNarrativeContext,
  ): Promise<ContentProviderResult>;
}

export const CONTENT_PROVIDER = Symbol("CONTENT_PROVIDER");
