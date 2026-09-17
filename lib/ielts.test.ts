import { describe, expect, it } from "vitest";
import { createIeltsTrainingState, getIeltsDayPlan, getPlanMinutes } from "./ielts";

describe("IELTS 30-day plan", () => {
  it("provides exactly 120 minutes for every day", () => {
    for (let day = 1; day <= 30; day += 1) {
      expect(getPlanMinutes(getIeltsDayPlan(day)), `day ${day}`).toBe(120);
    }
  });

  it("uses the four intended stages and checkpoints", () => {
    expect(getIeltsDayPlan(1).phaseName).toBe("英语重启");
    expect(getIeltsDayPlan(8).phaseName).toBe("能力强化");
    expect(getIeltsDayPlan(16).phaseName).toBe("雅思衔接");
    expect(getIeltsDayPlan(24).phaseName).toBe("小冲刺");
    expect(getIeltsDayPlan(1).checkpoint).toBe("baseline");
    expect(getIeltsDayPlan(15).checkpoint).toBe("day15");
    expect(getIeltsDayPlan(30).checkpoint).toBe("day30");
  });

  it("starts locally on day one without touching vocabulary history", () => {
    const state = createIeltsTrainingState(new Date("2026-09-17T08:00:00+08:00"));
    expect(state.currentDay).toBe(1);
    expect(state.completed).toEqual({});
    expect(state.startedAt).toContain("2026-09-17");
  });
});

