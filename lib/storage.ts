import { createInitialState } from "./seed";
import type { CEFRLevel, VocabularyState, VocabularyWord } from "./types";

const STORAGE_KEY = "ciji-vocabulary-state-v2";
const LEGACY_STORAGE_KEY = "ciji-vocabulary-state-v1";

function migrateState(value: unknown): VocabularyState {
  if (!value || typeof value !== "object") throw new Error("Invalid saved state");
  const parsed = value as Partial<VocabularyState>;
  if (!Array.isArray(parsed.words) || !Array.isArray(parsed.logs)) {
    throw new Error("Invalid saved state");
  }

  const validLevels = new Set<CEFRLevel>(["A1", "A2", "B1", "B2", "C1", "C2"]);
  const words = parsed.words.map((word) => {
    const legacy = word as Partial<VocabularyWord>;
    const createdAt = legacy.createdAt ?? new Date().toISOString();
    return {
      ...legacy,
      level:
        legacy.level === "custom" || validLevels.has(legacy.level as CEFRLevel)
          ? legacy.level
          : "B1",
      source: legacy.source ?? "seed",
      introducedAt: legacy.introducedAt ?? createdAt,
      spellingAttempts: legacy.spellingAttempts ?? 0,
      spellingCorrect: legacy.spellingCorrect ?? 0,
      contextReviewCount: legacy.contextReviewCount ?? 0,
    } as VocabularyWord;
  });

  return {
    version: 2,
    words,
    logs: parsed.logs.map((log) => ({
      ...log,
      mode: log.mode ?? "recognition",
    })),
    settings: {
      dailyGoal: parsed.settings?.dailyGoal ?? 8,
      selectedLevel: parsed.settings?.selectedLevel ?? "B1",
      activePlan: parsed.settings?.activePlan ?? null,
    },
  };
}

export function loadState(): VocabularyState {
  if (typeof window === "undefined") return createInitialState();

  const raw =
    window.localStorage.getItem(STORAGE_KEY) ??
    window.localStorage.getItem(LEGACY_STORAGE_KEY);
  if (!raw) {
    const initialState = createInitialState();
    saveState(initialState);
    return initialState;
  }

  try {
    const parsed = migrateState(JSON.parse(raw));
    saveState(parsed);
    return parsed;
  } catch {
    const recoveredState = createInitialState();
    saveState(recoveredState);
    return recoveredState;
  }
}

export function saveState(state: VocabularyState): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function exportState(state: VocabularyState): void {
  const blob = new Blob([JSON.stringify(state, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `词迹备份-${new Date().toISOString().slice(0, 10)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}
