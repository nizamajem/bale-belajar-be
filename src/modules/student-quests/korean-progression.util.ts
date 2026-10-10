/** Branch prerequisites are content relationships, never inferred TOPIK certification. */
export function optionalKoreanQuest(code: string) {
  return /^KOR-KO0[56]-/.test(code) || /^KOR-KO08-U0[1-4]-/.test(code);
}

export function availableKoreanQuests<T extends { id: string; chapterId?: string | null; chapter?: { prerequisiteChapterId?: string | null } | null }>(quests: T[], passed: Set<string>) {
  return quests.filter(quest => {
    if (passed.has(quest.id)) return false;
    const earlier = quests.filter(q => q.chapterId === quest.chapterId);
    if (earlier.find(q => !passed.has(q.id))?.id !== quest.id) return false;
    const prerequisite = quest.chapter?.prerequisiteChapterId;
    if (!prerequisite) return true;
    const required = quests.filter(q => q.chapterId === prerequisite);
    return required.length > 0 && required.every(q => passed.has(q.id));
  });
}
