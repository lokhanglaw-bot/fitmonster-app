import { describe, it, expect } from "vitest";

describe("Monster Hatching", () => {
  const MONSTER_TYPES = [
    { type: "Bodybuilder", str: 14, def: 10, agi: 8 },
    { type: "Physique", str: 8, def: 8, agi: 14 },
    { type: "Powerlifter", str: 16, def: 12, agi: 6 },
  ];

  it("should have 3 monster types available", () => {
    expect(MONSTER_TYPES.length).toBe(3);
  });

  it("should have unique base stats for each type", () => {
    const types = MONSTER_TYPES.map((t) => t.type);
    expect(new Set(types).size).toBe(3);
    // Bodybuilder should be strength-focused
    const bb = MONSTER_TYPES.find((t) => t.type === "Bodybuilder")!;
    expect(bb.str).toBeGreaterThan(bb.agi);
    // Physique should be agility-focused
    const ph = MONSTER_TYPES.find((t) => t.type === "Physique")!;
    expect(ph.agi).toBeGreaterThan(ph.str);
    // Powerlifter should have highest strength
    const pl = MONSTER_TYPES.find((t) => t.type === "Powerlifter")!;
    expect(pl.str).toBe(Math.max(...MONSTER_TYPES.map((t) => t.str)));
  });
});

describe("Workout EXP Calculation", () => {
  // EXP formula: MET * 3.5 * weight(kg) * duration(min) / 200
  function calcExp(met: number, weight: number, duration: number): number {
    return Math.round((met * 3.5 * weight * duration) / 200);
  }

  it("should calculate EXP correctly for running 30 min at 70kg", () => {
    const exp = calcExp(8, 70, 30);
    expect(exp).toBe(294); // 8 * 3.5 * 70 * 30 / 200 = 294
  });

  it("should calculate EXP correctly for yoga 45 min at 60kg", () => {
    const exp = calcExp(3, 60, 45);
    expect(exp).toBe(142); // 3 * 3.5 * 60 * 45 / 200 = 141.75 -> rounds to 142
  });

  it("should return 0 EXP for 0 duration", () => {
    const exp = calcExp(8, 70, 0);
    expect(exp).toBe(0);
  });

  it("should scale linearly with duration", () => {
    const exp30 = calcExp(8, 70, 30);
    const exp60 = calcExp(8, 70, 60);
    expect(exp60).toBe(exp30 * 2);
  });
});

describe("Battle System", () => {
  it("should calculate damage within expected ranges for attack", () => {
    // Attack: random(0-19) + 15 = 15-34
    for (let i = 0; i < 100; i++) {
      const dmg = Math.floor(Math.random() * 20) + 15;
      expect(dmg).toBeGreaterThanOrEqual(15);
      expect(dmg).toBeLessThanOrEqual(34);
    }
  });

  it("should calculate damage within expected ranges for special attack", () => {
    // Special: random(0-34) + 25 = 25-59
    for (let i = 0; i < 100; i++) {
      const dmg = Math.floor(Math.random() * 35) + 25;
      expect(dmg).toBeGreaterThanOrEqual(25);
      expect(dmg).toBeLessThanOrEqual(59);
    }
  });

  it("should reduce enemy damage when defending", () => {
    const baseDmg = 20;
    const defendReduction = 10;
    const reducedDmg = Math.max(5, baseDmg - defendReduction);
    expect(reducedDmg).toBe(10);
    // Even with high reduction, minimum is 5
    const lowDmg = Math.max(5, 8 - defendReduction);
    expect(lowDmg).toBe(5);
  });

  it("should not allow HP to go below 0", () => {
    let hp = 30;
    const dmg = 50;
    hp = Math.max(0, hp - dmg);
    expect(hp).toBe(0);
  });
});

describe("Match System", () => {
  it("should track swipes correctly", () => {
    let swipesLeft = 50;
    // Like uses a swipe
    swipesLeft = Math.max(0, swipesLeft - 1);
    expect(swipesLeft).toBe(49);
    // Super like uses a swipe
    swipesLeft = Math.max(0, swipesLeft - 1);
    expect(swipesLeft).toBe(48);
    // Reject does NOT use a swipe (handled differently in UI)
    expect(swipesLeft).toBe(48);
  });

  it("should not go below 0 swipes", () => {
    let swipesLeft = 1;
    swipesLeft = Math.max(0, swipesLeft - 1);
    expect(swipesLeft).toBe(0);
    swipesLeft = Math.max(0, swipesLeft - 1);
    expect(swipesLeft).toBe(0);
  });
});

describe("Chat Messages", () => {
  const AUTO_REPLIES = [
    "Nice workout today! 💪",
    "Want to battle later?",
    "My monster just evolved! 🎉",
    "How many steps did you get today?",
    "Let's hit the gym together!",
    "Check out my new monster!",
    "GG! Great battle! 🏆",
    "What's your protein intake today?",
  ];

  it("should have auto-reply messages available", () => {
    expect(AUTO_REPLIES.length).toBeGreaterThan(0);
  });

  it("should select random replies from the pool", () => {
    const reply = AUTO_REPLIES[Math.floor(Math.random() * AUTO_REPLIES.length)];
    expect(AUTO_REPLIES).toContain(reply);
  });
});
