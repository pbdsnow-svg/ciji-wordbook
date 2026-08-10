import { describe, expect, it } from "vitest";
import {
  DIALOGUE_WORD_LIMIT,
  advanceDialogueQueue,
  buildDialogueLines,
  getTodayLearnedWordCount,
  getTodayLearnedWords,
} from "./dialogue";
import { ensureDailyWords } from "./learning";
import { createInitialState } from "./seed";
import type { VocabularyState } from "./types";

describe("dialogue review", () => {
  const now = new Date("2026-08-10T08:00:00+08:00");

  function createStudiedState(count: number): VocabularyState {
    const initial = createInitialState(now);
    const state = ensureDailyWords(
      {
        ...initial,
        words: [],
        settings: { ...initial.settings, dailyGoal: count },
      },
      now,
    );
    const words = state.words.map((word) => ({ ...word, reviewCount: 1 }));
    return {
      ...state,
      words,
      logs: words.map((word, index) => ({
        id: `study-${word.id}`,
        wordId: word.id,
        rating: "know" as const,
        reviewedAt: new Date(now.getTime() + index * 1000).toISOString(),
        mode: "spelling" as const,
      })),
    };
  }

  it("uses up to forty words learned today and leaves the remainder for another dialogue", () => {
    const state = createStudiedState(45);

    expect(getTodayLearnedWordCount(state, now)).toBe(45);
    expect(getTodayLearnedWords(state, now)).toHaveLength(DIALOGUE_WORD_LIMIT);
    expect(getTodayLearnedWords(state, now, DIALOGUE_WORD_LIMIT)).toHaveLength(5);
  });

  it("does not make a context-only review count as a newly learned word", () => {
    const state = createStudiedState(2);
    const oldWord = {
      ...state.words[0],
      id: "old-context-word",
      introducedAt: "2026-08-01T08:00:00.000Z",
      reviewCount: 4,
    };
    state.words.push(oldWord);
    state.logs.push({
      id: "context-only",
      wordId: oldWord.id,
      rating: "know",
      reviewedAt: now.toISOString(),
      mode: "context",
    });

    expect(getTodayLearnedWords(state, now).map((word) => word.id)).not.toContain(
      oldWord.id,
    );
  });

  it("builds one alternating conversation whose clues hide every target word", () => {
    const state = createStudiedState(6);
    const lines = buildDialogueLines(getTodayLearnedWords(state, now));

    expect(lines).toHaveLength(6);
    expect(lines.map((line) => line.speaker)).toEqual([
      "Mia",
      "Leo",
      "Mia",
      "Leo",
      "Mia",
      "Leo",
    ]);
    for (const line of lines) {
      expect(line.prompt.toLowerCase()).not.toContain(line.word.term.toLowerCase());
    }
  });

  it("returns a missed word after three other dialogue turns", () => {
    expect(
      advanceDialogueQueue(["a", "b", "c", "d", "e"], false, 1),
    ).toEqual(["b", "c", "d", "a", "e"]);
    expect(advanceDialogueQueue(["a", "b", "c"], true, 1)).toEqual([
      "b",
      "c",
    ]);
    expect(advanceDialogueQueue(["a", "b", "c"], false, 3)).toEqual([
      "b",
      "c",
    ]);
  });
});
