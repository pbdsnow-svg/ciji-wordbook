import { createInitialState } from "./seed";
import type { VocabularyState } from "./types";

const STORAGE_KEY = "ciji-vocabulary-state-v1";

export function loadState(): VocabularyState {
  if (typeof window === "undefined") return createInitialState();

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const initialState = createInitialState();
    saveState(initialState);
    return initialState;
  }

  try {
    const parsed = JSON.parse(raw) as VocabularyState;
    if (!Array.isArray(parsed.words) || !Array.isArray(parsed.logs)) {
      throw new Error("Invalid saved state");
    }
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
