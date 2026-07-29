import { describe, expect, it } from "vitest";
import { createInitialState } from "./seed";
import {
  getDueWords,
  getReviewCountsForLastSevenDays,
  getStreak,
  reviewWord,
} from "./srs";

describe("review scheduling", () => {
  const now = new Date("2026-07-29T08:00:00.000Z");
  const word = createInitialState(now).words[0];

  it("schedules a known word one day later on its first review", () => {
    const result = reviewWord(word, "know", now);
    expect(result.word.stage).toBe(1);
    expect(result.word.reviewCount).toBe(1);
    expect(result.word.nextReviewAt).toBe("2026-07-30T08:00:00.000Z");
  });

  it("returns a forgotten word to a short review interval", () => {
    const learnedWord = { ...word, stage: 3, reviewCount: 4 };
    const result = reviewWord(learnedWord, "forgot", now);
    expect(result.word.stage).toBe(2);
    expect(result.word.nextReviewAt).toBe("2026-07-29T12:00:00.000Z");
  });

  it("only includes words whose review time has arrived", () => {
    const state = createInitialState(now);
    state.words[0].nextReviewAt = "2026-07-29T07:59:00.000Z";
    state.words[1].nextReviewAt = "2026-07-29T08:01:00.000Z";
    expect(getDueWords(state, now).map((item) => item.id)).not.toContain(
      state.words[1].id,
    );
  });
});

describe("learning statistics", () => {
  it("counts a continuous streak ending today", () => {
    const logs = [0, 1, 2].map((offset) => ({
      id: `${offset}`,
      wordId: "word",
      rating: "know" as const,
      reviewedAt: new Date(2026, 6, 29 - offset, 12).toISOString(),
    }));
    expect(getStreak(logs, new Date(2026, 6, 29, 18))).toBe(3);
  });

  it("returns seven daily buckets", () => {
    const buckets = getReviewCountsForLastSevenDays(
      [],
      new Date(2026, 6, 29, 18),
    );
    expect(buckets).toHaveLength(7);
    expect(buckets.every((bucket) => bucket.count === 0)).toBe(true);
  });
});
