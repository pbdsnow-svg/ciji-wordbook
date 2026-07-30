import { describe, expect, it } from "vitest";
import {
  getDailyClassic,
  getLookupCandidates,
  sentenceForWord,
  tokenizeReading,
} from "./readings";

describe("daily reading helpers", () => {
  it("keeps a recommendation stable during the same day", () => {
    const morning = new Date(2026, 6, 30, 8);
    const evening = new Date(2026, 6, 30, 22);
    expect(getDailyClassic(morning).id).toBe(getDailyClassic(evening).id);
  });

  it("separates tappable words from punctuation", () => {
    const tokens = tokenizeReading("Alice can't wait.");
    expect(tokens.filter((token) => token.isWord).map((token) => token.value)).toEqual(
      ["Alice", "can't", "wait"],
    );
  });

  it("derives useful dictionary candidates from inflections", () => {
    expect(getLookupCandidates("studies")).toContain("study");
    expect(getLookupCandidates("making")).toContain("make");
  });

  it("extracts the sentence containing a selected word", () => {
    expect(sentenceForWord("One sentence. Another is clear.", "clear")).toBe(
      "Another is clear.",
    );
  });
});
