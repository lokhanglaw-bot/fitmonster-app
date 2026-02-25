import { describe, it, expect } from "vitest";
import { calculateHpEffect, calculateBattleModifiers, getMonsterStatus } from "../server/caring-db";

// Helper to create a mock MonsterCaring object
function mockCaring(overrides: Partial<{
  fullness: number;
  energy: number;
  mood: number;
  peakStateBuff: boolean;
  consecutiveBalancedDays: number;
  consecutiveExerciseDays: number;
}> = {}) {
  return {
    id: 1,
    userId: 1,
    fullness: overrides.fullness ?? 70,
    energy: overrides.energy ?? 70,
    mood: overrides.mood ?? 70,
    peakStateBuff: overrides.peakStateBuff ?? false,
    lastFedAt: new Date(),
    lastExerciseAt: new Date(),
    lastDecayAt: new Date(),
    consecutiveBalancedDays: overrides.consecutiveBalancedDays ?? 0,
    consecutiveExerciseDays: overrides.consecutiveExerciseDays ?? 0,
    nutritionAdvice: null,
    nutritionAdviceDate: null,
    dailyHpLoss: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as any;
}

describe("calculateHpEffect", () => {
  it("returns positive HP change when fullness >= 80", () => {
    const result = calculateHpEffect(85);
    expect(result.hpChange).toBe(1);
    expect(result.reason).toBe("well_fed");
  });

  it("returns 0 HP change when fullness is 50-79", () => {
    const result = calculateHpEffect(60);
    expect(result.hpChange).toBe(0);
    expect(result.reason).toBe("normal");
  });

  it("returns 0 HP change when fullness is 20-49 (slightly hungry)", () => {
    const result = calculateHpEffect(30);
    expect(result.hpChange).toBe(0);
    expect(result.reason).toBe("slightly_hungry");
  });

  it("returns -2 HP change when fullness is 1-19 (very hungry)", () => {
    const result = calculateHpEffect(10);
    expect(result.hpChange).toBe(-2);
    expect(result.reason).toBe("very_hungry");
  });

  it("returns -5 HP change when fullness is 0 (starving)", () => {
    const result = calculateHpEffect(0);
    expect(result.hpChange).toBe(-5);
    expect(result.reason).toBe("starving");
  });
});

describe("calculateBattleModifiers", () => {
  it("returns peak state modifiers when fullness and energy are both >= 80", () => {
    const caring = mockCaring({ fullness: 85, energy: 85 });
    const result = calculateBattleModifiers(caring);
    expect(result.overallModifier).toBe(1.15);
    expect(result.speedModifier).toBe(1.10);
    expect(result.critModifier).toBe(0.05);
    expect(result.canBattle).toBe(true);
    expect(result.statusLabel).toBe("peak");
  });

  it("returns optimal state modifiers when fullness and energy are both >= 70", () => {
    const caring = mockCaring({ fullness: 75, energy: 75 });
    const result = calculateBattleModifiers(caring);
    expect(result.overallModifier).toBe(1.08);
    expect(result.canBattle).toBe(true);
    expect(result.statusLabel).toBe("optimal");
  });

  it("returns normal modifiers when fullness and energy are moderate", () => {
    const caring = mockCaring({ fullness: 55, energy: 55 });
    const result = calculateBattleModifiers(caring);
    expect(result.overallModifier).toBe(1.0);
    expect(result.speedModifier).toBe(1.0);
    expect(result.canBattle).toBe(true);
    expect(result.statusLabel).toBe("normal");
  });

  it("returns weak modifiers when fullness or energy is very low", () => {
    const caring = mockCaring({ fullness: 15, energy: 15 });
    const result = calculateBattleModifiers(caring);
    expect(result.speedModifier).toBe(0.90);
    expect(result.canBattle).toBe(true);
    expect(result.statusLabel).toBe("weak");
  });

  it("prevents battle when fullness is 0 (starving)", () => {
    const caring = mockCaring({ fullness: 0, energy: 50 });
    const result = calculateBattleModifiers(caring);
    expect(result.canBattle).toBe(false);
    expect(result.overallModifier).toBe(0.7);
    expect(result.statusLabel).toBe("starving");
  });
});

describe("getMonsterStatus", () => {
  it("returns satisfied/energetic/happy for high values", () => {
    const caring = mockCaring({ fullness: 90, energy: 90, mood: 90 });
    const result = getMonsterStatus(caring);
    expect(result.fullnessStatus).toBe("satisfied");
    expect(result.energyStatus).toBe("energetic");
    expect(result.moodStatus).toBe("happy");
    expect(result.overallStatus).toBe("excellent");
  });

  it("returns normal for moderate values", () => {
    const caring = mockCaring({ fullness: 60, energy: 60, mood: 60 });
    const result = getMonsterStatus(caring);
    expect(result.fullnessStatus).toBe("normal");
    expect(result.energyStatus).toBe("normal");
    expect(result.moodStatus).toBe("normal");
    expect(result.overallStatus).toBe("good");
  });

  it("returns hungry/lazy/sad for low values", () => {
    const caring = mockCaring({ fullness: 30, energy: 30, mood: 30 });
    const result = getMonsterStatus(caring);
    expect(result.fullnessStatus).toBe("hungry");
    expect(result.energyStatus).toBe("lazy");
    expect(result.moodStatus).toBe("sad");
    expect(result.overallStatus).toBe("fair");
  });

  it("returns starving/exhausted/depressed for very low values", () => {
    const caring = mockCaring({ fullness: 0, energy: 10, mood: 10 });
    const result = getMonsterStatus(caring);
    expect(result.fullnessStatus).toBe("starving");
    expect(result.energyStatus).toBe("exhausted");
    expect(result.moodStatus).toBe("depressed");
    expect(result.overallStatus).toBe("poor");
  });

  it("returns very_hungry for fullness 1-19", () => {
    const caring = mockCaring({ fullness: 15, energy: 50, mood: 50 });
    const result = getMonsterStatus(caring);
    expect(result.fullnessStatus).toBe("very_hungry");
  });
});
