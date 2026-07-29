import { describe, expect, it } from "vitest";
import {
  createCloze,
  createStudyPlan,
  ensureDailyWords,
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
});
