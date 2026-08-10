import { describe, expect, it } from "vitest";
import {
  DIALOGUE_WORD_LIMIT,
  advanceDialogueQueue,
  buildDialogueLines,
  buildDialogueScript,
  getDialoguePlotBeatIndex,
  getDialogueTheme,
  getTodayLearnedWordCount,
  getTodayLearnedWords,
} from "./dialogue";
import { ensureDailyWords } from "./learning";
import { createInitialState } from "./seed";
import type { VocabularyState, VocabularyWord } from "./types";

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

  it("classifies familiar words into stable offline themes", () => {
    const base = createStudiedState(1).words[0];
    const word = (term: string, example: string): VocabularyWord => ({
      ...base,
      id: `word-${term}`,
      term,
      example,
    });

    expect(getDialogueTheme(word("ticket", "I bought a ticket."))).toMatchObject({
      id: "travel",
      titleZh: "出门旅行",
    });
    expect(getDialogueTheme(word("project", "The project starts today."))).toMatchObject({
      id: "work-study",
    });
    expect(getDialogueTheme(word("coffee", "The coffee is ready."))).toMatchObject({
      id: "food-shopping",
    });
  });

  it("groups related words into scene chapters while keeping one dialogue", () => {
    const base = createStudiedState(1).words[0];
    const words = [
      { ...base, id: "travel-ticket", term: "ticket", example: "I need a ticket." },
      { ...base, id: "work-project", term: "project", example: "The project is ready." },
      { ...base, id: "travel-hotel", term: "hotel", example: "The hotel is nearby." },
      { ...base, id: "work-team", term: "team", example: "Our team can help." },
      { ...base, id: "work-report", term: "report", example: "Read the report." },
    ];
    const script = buildDialogueScript(words);

    expect(script.scenario.primaryTheme.id).toBe("work-study");
    expect(script.scenario.story.titleZh).toBe("最后一刻的汇报");
    expect(script.scenario.story.plotBeats).toHaveLength(4);
    expect(script.scenario.themes.map((theme) => theme.id)).toEqual([
      "work-study",
      "travel",
    ]);
    expect(script.lines.map((line) => line.theme.id)).toEqual([
      "work-study",
      "work-study",
      "work-study",
      "travel",
      "travel",
    ]);
    expect(script.lines.filter((line) => line.isSceneStart)).toHaveLength(2);
    expect(script.lines[0].lead).toContain("slide");
    expect(script.lines[3].theme.transitionZh).toContain("路线");
  });

  it("moves through four stable plot beats as words are resolved", () => {
    expect(getDialoguePlotBeatIndex(0, 40)).toBe(0);
    expect(getDialoguePlotBeatIndex(10, 40)).toBe(1);
    expect(getDialoguePlotBeatIndex(20, 40)).toBe(2);
    expect(getDialoguePlotBeatIndex(30, 40)).toBe(3);
    expect(getDialoguePlotBeatIndex(40, 40)).toBe(3);
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
