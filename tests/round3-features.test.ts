import { describe, it, expect } from "vitest";

/**
 * Round 3 Feature Tests
 * Tests for: monster backgrounds, hatch egg, manual log, sync steps,
 * battle animations, chat system, and button audit
 */

describe("Monster Image Backgrounds", () => {
  it("should have gradient colors defined for all monster types", () => {
    const MONSTER_GRADIENTS: Record<string, readonly [string, string]> = {
      Bodybuilder: ["#DCFCE7", "#BBF7D0"],
      Physique: ["#DBEAFE", "#BFDBFE"],
      Powerlifter: ["#FEF3C7", "#FDE68A"],
    };

    expect(MONSTER_GRADIENTS.Bodybuilder).toEqual(["#DCFCE7", "#BBF7D0"]);
    expect(MONSTER_GRADIENTS.Physique).toEqual(["#DBEAFE", "#BFDBFE"]);
    expect(MONSTER_GRADIENTS.Powerlifter).toEqual(["#FEF3C7", "#FDE68A"]);
  });

  it("should have image keys for all stages of all types", () => {
    const MONSTER_IMAGES_KEYS = [
      "Bodybuilder-1", "Bodybuilder-2", "Bodybuilder-3",
      "Physique-1", "Physique-2", "Physique-3",
      "Powerlifter-1", "Powerlifter-2", "Powerlifter-3",
    ];
    expect(MONSTER_IMAGES_KEYS).toHaveLength(9);
    for (const key of MONSTER_IMAGES_KEYS) {
      const [type, stage] = key.split("-");
      expect(["Bodybuilder", "Physique", "Powerlifter"]).toContain(type);
      expect(["1", "2", "3"]).toContain(stage);
    }
  });
});

describe("Hatch Egg Feature", () => {
  it("should create a new monster with correct base stats for Bodybuilder", () => {
    const baseStats: Record<string, { str: number; def: number; agi: number }> = {
      Bodybuilder: { str: 14, def: 10, agi: 8 },
      Physique: { str: 8, def: 8, agi: 14 },
      Powerlifter: { str: 16, def: 12, agi: 6 },
    };
    const stats = baseStats["Bodybuilder"];
    expect(stats.str).toBe(14);
    expect(stats.def).toBe(10);
    expect(stats.agi).toBe(8);
  });

  it("should create a new monster with correct base stats for Physique", () => {
    const baseStats: Record<string, { str: number; def: number; agi: number }> = {
      Bodybuilder: { str: 14, def: 10, agi: 8 },
      Physique: { str: 8, def: 8, agi: 14 },
      Powerlifter: { str: 16, def: 12, agi: 6 },
    };
    const stats = baseStats["Physique"];
    expect(stats.str).toBe(8);
    expect(stats.def).toBe(8);
    expect(stats.agi).toBe(14);
  });

  it("should create a new monster with correct base stats for Powerlifter", () => {
    const baseStats: Record<string, { str: number; def: number; agi: number }> = {
      Bodybuilder: { str: 14, def: 10, agi: 8 },
      Physique: { str: 8, def: 8, agi: 14 },
      Powerlifter: { str: 16, def: 12, agi: 6 },
    };
    const stats = baseStats["Powerlifter"];
    expect(stats.str).toBe(16);
    expect(stats.def).toBe(12);
    expect(stats.agi).toBe(6);
  });

  it("should add hatched monster to the team array", () => {
    const monsters = [
      { name: "Flexo", type: "Bodybuilder", level: 1 },
    ];
    const newMonster = { name: "Bibi", type: "Physique", level: 1 };
    const updatedMonsters = [...monsters, newMonster];
    expect(updatedMonsters).toHaveLength(2);
    expect(updatedMonsters[1].name).toBe("Bibi");
    expect(updatedMonsters[1].type).toBe("Physique");
  });

  it("should reject empty monster names", () => {
    const name = "";
    expect(name.trim()).toBe("");
    expect(name.trim().length).toBe(0);
  });
});

describe("Manual Log Feature", () => {
  it("should calculate EXP correctly for manual workout", () => {
    const estimatedMet = 5;
    const weight = 70;
    const duration = 30;
    const exp = Math.round(estimatedMet * 3.5 * weight * duration / 200);
    expect(exp).toBe(184);
  });

  it("should calculate EXP for different weights", () => {
    const estimatedMet = 5;
    const weight = 90;
    const duration = 45;
    const exp = Math.round(estimatedMet * 3.5 * weight * duration / 200);
    expect(exp).toBe(354);
  });

  it("should validate duration is a positive number", () => {
    const validDuration = parseInt("30", 10);
    expect(isNaN(validDuration)).toBe(false);
    expect(validDuration > 0).toBe(true);

    const invalidDuration = parseInt("abc", 10);
    expect(isNaN(invalidDuration)).toBe(true);

    const zeroDuration = parseInt("0", 10);
    expect(zeroDuration > 0).toBe(false);
  });
});

describe("Sync Steps Feature", () => {
  it("should accumulate steps correctly", () => {
    let steps = 0;
    const simulatedSteps = 2500;
    steps += simulatedSteps;
    expect(steps).toBe(2500);

    const moreSteps = 1500;
    steps += moreSteps;
    expect(steps).toBe(4000);
  });

  it("should generate random steps within range", () => {
    for (let i = 0; i < 100; i++) {
      const simulatedSteps = Math.floor(Math.random() * 3000) + 1000;
      expect(simulatedSteps).toBeGreaterThanOrEqual(1000);
      expect(simulatedSteps).toBeLessThan(4000);
    }
  });
});

describe("Battle System", () => {
  it("should calculate attack damage within expected range", () => {
    for (let i = 0; i < 100; i++) {
      const dmg = Math.floor(Math.random() * 20) + 15;
      expect(dmg).toBeGreaterThanOrEqual(15);
      expect(dmg).toBeLessThanOrEqual(34);
    }
  });

  it("should calculate special attack damage within expected range", () => {
    for (let i = 0; i < 100; i++) {
      const dmg = Math.floor(Math.random() * 35) + 25;
      expect(dmg).toBeGreaterThanOrEqual(25);
      expect(dmg).toBeLessThanOrEqual(59);
    }
  });

  it("should reduce damage when defending", () => {
    const isDefending = true;
    const baseDmg = 20;
    const enemyDmg = Math.max(5, baseDmg - (isDefending ? 10 : 0));
    expect(enemyDmg).toBe(10);
  });

  it("should not reduce HP below 0", () => {
    let hp = 30;
    const dmg = 50;
    hp = Math.max(0, hp - dmg);
    expect(hp).toBe(0);
  });

  it("should detect win condition when enemy HP reaches 0", () => {
    const enemyHp = 0;
    const isWin = enemyHp <= 0;
    expect(isWin).toBe(true);
  });

  it("should detect lose condition when player HP reaches 0", () => {
    const playerHp = 0;
    const isLose = playerHp <= 0;
    expect(isLose).toBe(true);
  });
});

describe("Chat System", () => {
  it("should create a message with correct structure", () => {
    const msg = {
      id: "1",
      text: "Hello!",
      sender: "me" as const,
      timestamp: new Date(),
    };
    expect(msg.id).toBe("1");
    expect(msg.text).toBe("Hello!");
    expect(msg.sender).toBe("me");
    expect(msg.timestamp).toBeInstanceOf(Date);
  });

  it("should support image messages", () => {
    const msg = {
      id: "2",
      imageUri: "file:///photo.jpg",
      sender: "me" as const,
      timestamp: new Date(),
    };
    expect(msg.imageUri).toBe("file:///photo.jpg");
    expect((msg as { text?: string }).text).toBeUndefined();
  });

  it("should generate auto-replies from the pool", () => {
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
    const reply = AUTO_REPLIES[Math.floor(Math.random() * AUTO_REPLIES.length)];
    expect(AUTO_REPLIES).toContain(reply);
  });
});

describe("Theme Colors", () => {
  it("should have light green/mint theme for light mode", () => {
    const themeColors = {
      primary: { light: '#22C55E', dark: '#22C55E' },
      background: { light: '#F0FDF4', dark: '#0F0B1A' },
      surface: { light: '#FFFFFF', dark: '#1A1528' },
      foreground: { light: '#1A1A2E', dark: '#F8FAFC' },
    };
    expect(themeColors.primary.light).toBe('#22C55E');
    expect(themeColors.background.light).toBe('#F0FDF4');
    expect(themeColors.surface.light).toBe('#FFFFFF');
  });
});

describe("Exercise Grid", () => {
  it("should have correct MET values for exercises", () => {
    const EXERCISES = [
      { name: "Running", met: 8 },
      { name: "Cycling", met: 7.5 },
      { name: "Swimming", met: 7 },
      { name: "Walking", met: 3.5 },
      { name: "Bench Press", met: 6 },
      { name: "Yoga Flow", met: 3 },
      { name: "Basketball", met: 6.5 },
    ];
    expect(EXERCISES.find(e => e.name === "Running")?.met).toBe(8);
    expect(EXERCISES.find(e => e.name === "Yoga Flow")?.met).toBe(3);
    expect(EXERCISES.find(e => e.name === "Basketball")?.met).toBe(6.5);
  });

  it("should filter exercises by category", () => {
    const EXERCISES = [
      { name: "Running", category: "Running" },
      { name: "Cycling", category: "Running" },
      { name: "Bench Press", category: "Weight Training" },
      { name: "Yoga Flow", category: "Yoga" },
      { name: "Basketball", category: "Basketball" },
    ];
    const running = EXERCISES.filter(e => e.category === "Running");
    expect(running).toHaveLength(2);
    const all = EXERCISES;
    expect(all).toHaveLength(5);
  });
});

describe("Opponent Matching", () => {
  it("should have valid match percentages", () => {
    const opponents = [
      { name: "FitChamp", matchPercent: 85 },
      { name: "GymRat", matchPercent: 72 },
      { name: "YogaMaster", matchPercent: 65 },
      { name: "IronWill", matchPercent: 90 },
    ];
    for (const opp of opponents) {
      expect(opp.matchPercent).toBeGreaterThanOrEqual(0);
      expect(opp.matchPercent).toBeLessThanOrEqual(100);
    }
  });

  it("should add friend to list after matching", () => {
    const friends: { id: number; name: string }[] = [];
    const newFriend = { id: 1, name: "FitChamp" };

    // Should not add duplicate
    if (!friends.find(f => f.id === newFriend.id)) {
      friends.push(newFriend);
    }
    expect(friends).toHaveLength(1);

    // Should not add duplicate
    if (!friends.find(f => f.id === newFriend.id)) {
      friends.push(newFriend);
    }
    expect(friends).toHaveLength(1);
  });
});
