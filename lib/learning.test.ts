import { describe, expect, it } from "vitest";
import {
  buildChoiceOptions,
  createCloze,
  createStudyPlan,
  ensureDailyWords,
  getDailyLearningProgress,
  getPlanMetrics,
  isSpellingCorrect,
} from "./learning";
import { createInitialState } from "./seed";

describe("learning helpers", () => {
  it("normalizes spelling without accepting missing letters", () => {
    expect(isSpellingCorrect("  Resilient ", "resilient")).toBe(true);
    expect(isSpellingCorrect("resilent", "resilient")).toBe(false);
  });

  it("creates a case-insensitive cloze", () => {
    expect(createCloze("Resilient people stay resilient.", "resilient")).toBe(
      "＿＿＿＿ people stay ＿＿＿＿.",
    );
  });

  it("tops up the daily set from the selected CEFR level", () => {
    const now = new Date("2026-07-29T08:00:00+08:00");
    const state = createInitialState(now);
    const next = ensureDailyWords(
      {
        ...state,
        words: [],
        settings: { ...state.settings, dailyGoal: 5, selectedLevel: "A2" },
      },
      now,
    );
    expect(next.words).toHaveLength(5);
    expect(next.words.every((word) => ["A1", "A2"].includes(word.level))).toBe(
      true,
    );
  });

  it("tops up a fresh target when the local day changes", () => {
    const firstDay = new Date("2026-08-03T08:00:00+08:00");
    const secondDay = new Date("2026-08-04T08:00:00+08:00");
    const initial = {
      ...createInitialState(firstDay),
      words: [],
      settings: {
        ...createInitialState(firstDay).settings,
        dailyGoal: 5,
      },
    };
    const dayOneState = ensureDailyWords(initial, firstDay);
    const dayTwoState = ensureDailyWords(dayOneState, secondDay);

    expect(getDailyLearningProgress(dayOneState, firstDay).introduced).toBe(5);
    expect(getDailyLearningProgress(dayTwoState, secondDay).introduced).toBe(5);
    expect(dayTwoState.words).toHaveLength(10);
  });

  it("counts only unique spelling completions for today's target words", () => {
    const now = new Date("2026-08-03T08:00:00+08:00");
    const state = ensureDailyWords(
      {
        ...createInitialState(now),
        words: [],
        settings: { ...createInitialState(now).settings, dailyGoal: 2 },
      },
      now,
    );
    const [todayWord] = state.words;
    const oldWord = {
      ...todayWord,
      id: "old-word",
      introducedAt: "2026-08-01T00:00:00.000Z",
    };
    const reviewedAt = now.toISOString();
    const progress = getDailyLearningProgress(
      {
        ...state,
        words: [...state.words, oldWord],
        logs: [
          {
            id: "today-1",
            wordId: todayWord.id,
            rating: "know",
            reviewedAt,
            mode: "spelling",
          },
          {
            id: "today-duplicate",
            wordId: todayWord.id,
            rating: "know",
            reviewedAt,
            mode: "spelling",
          },
          {
            id: "old-review",
            wordId: oldWord.id,
            rating: "know",
            reviewedAt,
            mode: "spelling",
          },
        ],
      },
      now,
    );

    expect(progress).toEqual({ target: 2, introduced: 2, completed: 1 });
  });

  it("tracks a custom plan target and day", () => {
    const now = new Date("2026-07-29T08:00:00+08:00");
    const plan = createStudyPlan(
      { name: "一个月 1500 词", level: "B2", durationDays: 30, dailyNewWords: 50 },
      now,
    );
    const state = createInitialState(now);
    const metrics = getPlanMetrics(
      plan,
      { ...state, settings: { ...state.settings, activePlan: plan } },
      now,
    );
    expect(metrics.target).toBe(1500);
    expect(metrics.day).toBe(1);
  });

  it("builds unique cloze choices that always include the answer", () => {
    const now = new Date("2026-08-03T08:00:00+08:00");
    const state = ensureDailyWords(
      { ...createInitialState(now), words: [] },
      now,
    );
    const target = state.words[0];
    const options = buildChoiceOptions(target, state.words, 4);

    expect(options).toHaveLength(4);
    expect(options.some((word) => word.id === target.id)).toBe(true);
    expect(new Set(options.map((word) => word.term.toLowerCase())).size).toBe(4);
  });
});
