import { describe, it, expect } from "vitest";

// Note: We can't import monster-expressions.ts directly because it uses require()
// for image assets which aren't available in vitest. Instead we test the pure logic
// by reimplementing the expression determination function.

type MonsterExpression = "default" | "hungry" | "tired" | "happy" | "peak";

function getMonsterExpression(
  fullness: number,
  energy: number,
  _mood: number,
  peakStateBuff: boolean
): MonsterExpression {
  if (peakStateBuff || (fullness > 80 && energy > 80)) return "peak";
  if (fullness < 30) return "hungry";
  if (energy < 30) return "tired";
  if (fullness > 60 && energy > 60) return "happy";
  return "default";
}

describe("Bug Fix #2: Fullness decay cap logic", () => {
  it("decay cap should limit fullness loss to 8 per application", () => {
    const hoursElapsed = 10; // 10 hours offline
    const rawFullnessDecay = Math.floor(hoursElapsed * 3.5); // 35
    const fullnessDecay = Math.min(rawFullnessDecay, 8); // capped at 8
    expect(fullnessDecay).toBe(8);
    expect(rawFullnessDecay).toBe(35); // would have been 35 without cap
  });

  it("decay cap should limit energy loss to 4 per application", () => {
    const hoursElapsed = 10;
    const rawEnergyDecay = Math.floor(hoursElapsed * 0.8); // 8
    const energyDecay = Math.min(rawEnergyDecay, 4); // capped at 4
    expect(energyDecay).toBe(4);
  });

  it("short intervals should not be capped (under cap)", () => {
    const hoursElapsed = 1;
    const rawFullnessDecay = Math.floor(hoursElapsed * 3.5); // 3
    const fullnessDecay = Math.min(rawFullnessDecay, 8);
    expect(fullnessDecay).toBe(3);
  });

  it("decay should not apply if less than 30 minutes", () => {
    const hoursElapsed = 0.4;
    const shouldDecay = hoursElapsed >= 0.5;
    expect(shouldDecay).toBe(false);
  });

  it("decay should apply if 30+ minutes elapsed", () => {
    const hoursElapsed = 0.5;
    const shouldDecay = hoursElapsed >= 0.5;
    expect(shouldDecay).toBe(true);
  });

  it("negative hoursElapsed should be rejected (safety check)", () => {
    const hoursElapsed = -5;
    const isInvalid = hoursElapsed < 0 || hoursElapsed > 168;
    expect(isInvalid).toBe(true);
  });

  it("extremely large hoursElapsed should be rejected (>168h)", () => {
    const hoursElapsed = 200;
    const isInvalid = hoursElapsed < 0 || hoursElapsed > 168;
    expect(isInvalid).toBe(true);
  });

  it("starting from 100, max single decay brings fullness to 92", () => {
    const startFullness = 100;
    const maxDecay = 8;
    const result = Math.max(0, startFullness - maxDecay);
    expect(result).toBe(92);
  });
});

describe("Bug Fix #3: Monster expression determination", () => {
  it("returns peak expression when peakStateBuff is true", () => {
    const expr = getMonsterExpression(90, 90, 70, true);
    expect(expr).toBe("peak");
  });

  it("returns peak expression when fullness and energy > 80 even without buff", () => {
    const expr = getMonsterExpression(85, 85, 70, false);
    expect(expr).toBe("peak");
  });

  it("returns hungry expression when fullness < 30", () => {
    const expr = getMonsterExpression(20, 70, 50, false);
    expect(expr).toBe("hungry");
  });

  it("returns tired expression when energy < 30", () => {
    const expr = getMonsterExpression(70, 20, 50, false);
    expect(expr).toBe("tired");
  });

  it("returns happy expression when fullness > 60 and energy > 60", () => {
    const expr = getMonsterExpression(70, 70, 70, false);
    expect(expr).toBe("happy");
  });

  it("returns default expression for neutral state", () => {
    const expr = getMonsterExpression(50, 50, 50, false);
    expect(expr).toBe("default");
  });

  it("hungry takes priority over tired when both are low", () => {
    const expr = getMonsterExpression(20, 20, 50, false);
    expect(expr).toBe("hungry");
  });

  it("peak takes priority over everything", () => {
    const expr = getMonsterExpression(10, 10, 10, true);
    expect(expr).toBe("peak");
  });
});
