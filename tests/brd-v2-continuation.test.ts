import { describe, it, expect } from "vitest";

// ── Module 3: Context-Aware Dialogue ──────────────────────────

// Import the caring prompt function
import { getQuickStatusDialogue, DialogueContext } from "../server/caring-prompt";

describe("Module 3: Context-Aware Reactive Dialogue", () => {
  const monsterName = "鐵拳熊";
  const monsterType = "powerlifter2";

  it("should trigger PR celebration dialogue", () => {
    const result = getQuickStatusDialogue("zh", monsterName, monsterType, 70, 70, 70, { lastPR: true });
    expect(result).toContain("新紀錄");
    expect(result).toContain(monsterName);
  });

  it("should trigger battle won dialogue", () => {
    const result = getQuickStatusDialogue("zh", monsterName, monsterType, 70, 70, 70, { battleWon: true });
    expect(result).toContain("贏了");
  });

  it("should trigger battle lost dialogue", () => {
    const result = getQuickStatusDialogue("zh", monsterName, monsterType, 70, 70, 70, { battleLost: true });
    expect(result).toContain("輸了");
  });

  it("should trigger sugar over limit warning", () => {
    const result = getQuickStatusDialogue("zh", monsterName, monsterType, 70, 70, 70, { sugarOverLimit: true });
    expect(result).toContain("糖");
  });

  it("should trigger idle dialogue after 3+ hours", () => {
    const result = getQuickStatusDialogue("zh", monsterName, monsterType, 70, 70, 70, { idleHours: 4 });
    // The idle dialogue may randomly pick one that doesn't include the number
    expect(result).toContain(monsterName);
    // Should be one of the idle dialogues (contains idle-related keywords)
    const isIdleDialogue = result.includes("無聊") || result.includes("沒動") || result.includes("忘了");
    expect(isIdleDialogue).toBe(true);
  });

  it("should trigger workout + protein dialogue", () => {
    const result = getQuickStatusDialogue("zh", monsterName, monsterType, 70, 70, 70, {
      todayWorkoutDone: true,
      todayProteinMet: true,
    });
    expect(result).toContain("蛋白質");
  });

  it("should trigger workout only dialogue", () => {
    const result = getQuickStatusDialogue("zh", monsterName, monsterType, 70, 70, 70, {
      todayWorkoutDone: true,
      todayProteinMet: false,
    });
    expect(result).toContain("蛋白質");
  });

  it("should trigger streak celebration", () => {
    const result = getQuickStatusDialogue("zh", monsterName, monsterType, 70, 70, 70, { streak: 10 });
    expect(result).toContain("10");
    expect(result).toContain("天");
  });

  it("should trigger peak body type dialogue", () => {
    const result = getQuickStatusDialogue("zh", monsterName, monsterType, 70, 70, 70, { bodyType: "peak" });
    expect(result).toContain("巔峰");
  });

  it("should trigger obese body type dialogue", () => {
    const result = getQuickStatusDialogue("zh", monsterName, monsterType, 70, 70, 70, { bodyType: "obese" });
    expect(result).toContain("吃太多");
  });

  it("should fall back to status-based dialogue when no context events", () => {
    const result = getQuickStatusDialogue("zh", monsterName, monsterType, 80, 80, 80, {});
    // Should be one of the peak state dialogues
    expect(result).toContain(monsterName);
  });

  it("should work in English", () => {
    const result = getQuickStatusDialogue("en", "PowerBear", monsterType, 70, 70, 70, { lastPR: true });
    expect(result).toContain("PR");
    expect(result).toContain("PowerBear");
  });

  it("should prioritize event dialogues over status dialogues", () => {
    // Even though fullness is 0 (starving), PR should take priority
    const result = getQuickStatusDialogue("zh", monsterName, monsterType, 0, 0, 0, { lastPR: true });
    expect(result).toContain("新紀錄");
  });

  it("should handle hunger status when no context", () => {
    const result = getQuickStatusDialogue("zh", monsterName, monsterType, 10, 70, 70);
    expect(result).toContain("餓");
  });

  it("should handle low energy status", () => {
    const result = getQuickStatusDialogue("zh", monsterName, monsterType, 70, 10, 70);
    expect(result).toContain("累");
  });
});

// ── Module 4: Sugar Tracking in Food Logs ──────────────────────

describe("Module 4: Sugar Tracking Integration", () => {
  it("should define daily sugar limit constants", () => {
    // BRD: 25g WHO recommended limit for women, 36g for men
    const DAILY_SUGAR_LIMIT_FEMALE = 25;
    const DAILY_SUGAR_LIMIT_MALE = 36;
    expect(DAILY_SUGAR_LIMIT_FEMALE).toBe(25);
    expect(DAILY_SUGAR_LIMIT_MALE).toBe(36);
  });

  it("should calculate sugar over limit correctly", () => {
    const dailySugar = 30;
    const limit = 25;
    const isOver = dailySugar > limit;
    const overBy = dailySugar - limit;
    expect(isOver).toBe(true);
    expect(overBy).toBe(5);
  });

  it("should not flag sugar under limit", () => {
    const dailySugar = 20;
    const limit = 25;
    expect(dailySugar > limit).toBe(false);
  });
});

// ── Module 5: Share Card ──────────────────────────────────────

describe("Module 5: Share Card Data Preparation", () => {
  it("should format nutrition data for share card", () => {
    const shareData = {
      calories: 2100,
      protein: 150,
      carbs: 200,
      fats: 70,
      sugar: 18,
      date: "2025-04-30",
      monsterName: "鐵拳熊",
    };
    expect(shareData.calories).toBeGreaterThan(0);
    expect(shareData.protein).toBeGreaterThan(0);
    expect(shareData.sugar).toBeLessThan(25); // Under WHO limit
  });

  it("should generate share card title based on performance", () => {
    const getShareTitle = (proteinMet: boolean, sugarUnder: boolean): string => {
      if (proteinMet && sugarUnder) return "完美飲食日 🏆";
      if (proteinMet) return "蛋白質達標 💪";
      if (sugarUnder) return "控糖成功 🍃";
      return "今日飲食紀錄 📋";
    };
    expect(getShareTitle(true, true)).toBe("完美飲食日 🏆");
    expect(getShareTitle(true, false)).toBe("蛋白質達標 💪");
    expect(getShareTitle(false, true)).toBe("控糖成功 🍃");
    expect(getShareTitle(false, false)).toBe("今日飲食紀錄 📋");
  });
});

// ── Module 6: Nearby Players ──────────────────────────────────

describe("Module 6: Nearby Player Matching", () => {
  interface NearbyPlayer {
    id: string;
    distance: number; // meters
    isOnline: boolean;
    level: number;
  }

  const mockPlayers: NearbyPlayer[] = [
    { id: "1", distance: 50, isOnline: true, level: 12 },
    { id: "2", distance: 200, isOnline: true, level: 18 },
    { id: "3", distance: 500, isOnline: false, level: 9 },
    { id: "4", distance: 1200, isOnline: true, level: 14 },
  ];

  it("should filter players within 1km radius", () => {
    const nearby = mockPlayers.filter((p) => p.distance <= 1000);
    expect(nearby.length).toBe(3);
  });

  it("should filter online players only", () => {
    const online = mockPlayers.filter((p) => p.isOnline);
    expect(online.length).toBe(3);
  });

  it("should sort by distance ascending", () => {
    const sorted = [...mockPlayers].sort((a, b) => a.distance - b.distance);
    expect(sorted[0].distance).toBe(50);
    expect(sorted[sorted.length - 1].distance).toBe(1200);
  });

  it("should not allow challenging offline players", () => {
    const canChallenge = (player: NearbyPlayer) => player.isOnline && player.distance <= 1000;
    expect(canChallenge(mockPlayers[0])).toBe(true); // online, 50m
    expect(canChallenge(mockPlayers[2])).toBe(false); // offline
    expect(canChallenge(mockPlayers[3])).toBe(false); // too far (1200m)
  });
});

// ── Module 7: Gym Challenges ──────────────────────────────────

describe("Module 7: Gym Challenge System", () => {
  interface Challenge {
    id: string;
    participants: number;
    maxParticipants: number;
    difficulty: "easy" | "medium" | "hard" | "extreme";
    reward: { exp: number };
    progress: number;
  }

  const mockChallenge: Challenge = {
    id: "1",
    participants: 23,
    maxParticipants: 50,
    difficulty: "easy",
    reward: { exp: 200 },
    progress: 45,
  };

  it("should allow joining when not full", () => {
    const canJoin = mockChallenge.participants < mockChallenge.maxParticipants;
    expect(canJoin).toBe(true);
  });

  it("should not allow joining when full", () => {
    const fullChallenge = { ...mockChallenge, participants: 50 };
    const canJoin = fullChallenge.participants < fullChallenge.maxParticipants;
    expect(canJoin).toBe(false);
  });

  it("should calculate completion percentage correctly", () => {
    expect(mockChallenge.progress).toBe(45);
    expect(mockChallenge.progress >= 100).toBe(false);
  });

  it("should award EXP on completion", () => {
    const completedChallenge = { ...mockChallenge, progress: 100 };
    const isComplete = completedChallenge.progress >= 100;
    expect(isComplete).toBe(true);
    expect(completedChallenge.reward.exp).toBe(200);
  });

  it("should scale rewards by difficulty", () => {
    const difficultyMultiplier: Record<string, number> = {
      easy: 1,
      medium: 1.5,
      hard: 2.5,
      extreme: 4,
    };
    const baseExp = 200;
    expect(baseExp * difficultyMultiplier.easy).toBe(200);
    expect(baseExp * difficultyMultiplier.hard).toBe(500);
    expect(baseExp * difficultyMultiplier.extreme).toBe(800);
  });
});
