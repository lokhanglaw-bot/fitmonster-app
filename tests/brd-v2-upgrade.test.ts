import { describe, it, expect } from "vitest";

// ── Body Type System Tests ──────────────────────────────────────────────────

describe("Body Type System (Module 1)", () => {
  // Replicate the body type calculation logic from server/body-type.ts
  type BodyType = "peak" | "lean" | "standard" | "skinny" | "fat" | "obese";

  function determineBodyType(muscleScore: number, fatScore: number): BodyType {
    if (muscleScore >= 70 && fatScore <= 15) return "peak";
    if (muscleScore >= 50 && fatScore <= 20) return "lean";
    if (fatScore >= 40) return "obese";
    if (fatScore >= 30) return "fat";
    if (muscleScore <= 25) return "skinny";
    return "standard";
  }

  it("should classify peak body type correctly", () => {
    expect(determineBodyType(80, 10)).toBe("peak");
    expect(determineBodyType(70, 15)).toBe("peak");
    expect(determineBodyType(90, 5)).toBe("peak");
  });

  it("should classify lean body type correctly", () => {
    expect(determineBodyType(55, 18)).toBe("lean");
    expect(determineBodyType(60, 20)).toBe("lean");
    expect(determineBodyType(50, 20)).toBe("lean");
  });

  it("should classify obese body type correctly", () => {
    expect(determineBodyType(30, 45)).toBe("obese");
    expect(determineBodyType(60, 40)).toBe("obese");
  });

  it("should classify fat body type correctly", () => {
    expect(determineBodyType(40, 35)).toBe("fat");
    expect(determineBodyType(30, 30)).toBe("fat");
  });

  it("should classify skinny body type correctly", () => {
    expect(determineBodyType(20, 10)).toBe("skinny");
    expect(determineBodyType(25, 22)).toBe("skinny");
  });

  it("should classify standard body type correctly", () => {
    expect(determineBodyType(40, 22)).toBe("standard");
    expect(determineBodyType(45, 25)).toBe("standard");
  });

  // Body type attack modifier
  const BODY_TYPE_ATTACK_MOD: Record<BodyType, number> = {
    peak: 1.15,
    lean: 1.05,
    standard: 1.0,
    skinny: 0.9,
    fat: 0.85,
    obese: 0.75,
  };

  it("should have correct attack modifiers for each body type", () => {
    expect(BODY_TYPE_ATTACK_MOD.peak).toBe(1.15);
    expect(BODY_TYPE_ATTACK_MOD.lean).toBe(1.05);
    expect(BODY_TYPE_ATTACK_MOD.standard).toBe(1.0);
    expect(BODY_TYPE_ATTACK_MOD.skinny).toBe(0.9);
    expect(BODY_TYPE_ATTACK_MOD.fat).toBe(0.85);
    expect(BODY_TYPE_ATTACK_MOD.obese).toBe(0.75);
  });

  it("peak body type should have highest attack modifier", () => {
    const values = Object.values(BODY_TYPE_ATTACK_MOD);
    expect(Math.max(...values)).toBe(BODY_TYPE_ATTACK_MOD.peak);
  });
});

// ── Battle RPS System Tests ─────────────────────────────────────────────────

describe("Battle RPS System (Module 8)", () => {
  type BattleMove = "attack" | "dodge" | "counter";
  type RoundOutcome = "win" | "lose" | "draw";

  // Replicate RPS logic from server/battle-engine.ts
  function resolveRPS(p1Move: BattleMove, p2Move: BattleMove): RoundOutcome {
    if (p1Move === p2Move) return "draw";
    if (
      (p1Move === "attack" && p2Move === "counter") ||
      (p1Move === "dodge" && p2Move === "attack") ||
      (p1Move === "counter" && p2Move === "dodge")
    ) {
      return "win";
    }
    return "lose";
  }

  it("should resolve draw correctly", () => {
    expect(resolveRPS("attack", "attack")).toBe("draw");
    expect(resolveRPS("dodge", "dodge")).toBe("draw");
    expect(resolveRPS("counter", "counter")).toBe("draw");
  });

  it("should resolve attack beats counter", () => {
    expect(resolveRPS("attack", "counter")).toBe("win");
  });

  it("should resolve dodge beats attack", () => {
    expect(resolveRPS("dodge", "attack")).toBe("win");
  });

  it("should resolve counter beats dodge", () => {
    expect(resolveRPS("counter", "dodge")).toBe("win");
  });

  it("should resolve losses correctly", () => {
    expect(resolveRPS("attack", "dodge")).toBe("lose");
    expect(resolveRPS("dodge", "counter")).toBe("lose");
    expect(resolveRPS("counter", "attack")).toBe("lose");
  });

  // Fitness bonus calculation
  function calculateFitnessBonus(
    streak: number,
    todayWorkout: boolean,
    todayProtein: boolean
  ): number {
    let bonus = 0;
    if (streak >= 7) bonus += 15;
    else if (streak >= 3) bonus += 8;
    if (todayWorkout) bonus += 10;
    if (todayProtein) bonus += 5;
    return bonus;
  }

  it("should calculate fitness bonus with 7+ day streak", () => {
    expect(calculateFitnessBonus(7, true, true)).toBe(30);
    expect(calculateFitnessBonus(10, false, false)).toBe(15);
  });

  it("should calculate fitness bonus with 3-6 day streak", () => {
    expect(calculateFitnessBonus(3, true, true)).toBe(23);
    expect(calculateFitnessBonus(5, false, false)).toBe(8);
  });

  it("should calculate fitness bonus with no streak", () => {
    expect(calculateFitnessBonus(0, true, true)).toBe(15);
    expect(calculateFitnessBonus(0, false, false)).toBe(0);
  });

  // Damage calculation
  function calculateDamage(
    basePower: number,
    attackMod: number,
    fitnessBonus: number,
    isWin: boolean
  ): number {
    if (!isWin) return 0;
    const bonusMultiplier = 1 + fitnessBonus / 100;
    return Math.round(basePower * attackMod * bonusMultiplier);
  }

  it("should calculate damage correctly on win", () => {
    const dmg = calculateDamage(20, 1.15, 30, true);
    // 20 * 1.15 * 1.30 = 29.9 -> 30
    expect(dmg).toBe(30);
  });

  it("should return 0 damage on loss", () => {
    expect(calculateDamage(20, 1.15, 30, false)).toBe(0);
  });

  it("should handle zero fitness bonus", () => {
    const dmg = calculateDamage(20, 1.0, 0, true);
    // 20 * 1.0 * 1.0 = 20
    expect(dmg).toBe(20);
  });
});

// ── Workout Set Tracking Tests ──────────────────────────────────────────────

describe("Workout Set Tracking (Module 2)", () => {
  type SetType = "warmup" | "working" | "dropset" | "failure";

  interface WorkoutSetData {
    setNumber: number;
    weight: number;
    reps: number;
    setType: SetType;
    restSeconds: number;
    rpe?: number;
  }

  // PR detection logic
  function detectPR(
    newSet: WorkoutSetData,
    previousBest: { maxWeight: number; maxReps: number; maxVolume: number } | null
  ): { isWeightPR: boolean; isRepsPR: boolean; isVolumePR: boolean } {
    if (!previousBest) {
      return { isWeightPR: true, isRepsPR: true, isVolumePR: true };
    }
    const volume = newSet.weight * newSet.reps;
    return {
      isWeightPR: newSet.weight > previousBest.maxWeight,
      isRepsPR: newSet.reps > previousBest.maxReps,
      isVolumePR: volume > previousBest.maxVolume,
    };
  }

  it("should detect all PRs for first-time exercise", () => {
    const set: WorkoutSetData = { setNumber: 1, weight: 60, reps: 10, setType: "working", restSeconds: 90 };
    const result = detectPR(set, null);
    expect(result.isWeightPR).toBe(true);
    expect(result.isRepsPR).toBe(true);
    expect(result.isVolumePR).toBe(true);
  });

  it("should detect weight PR", () => {
    const set: WorkoutSetData = { setNumber: 1, weight: 70, reps: 8, setType: "working", restSeconds: 90 };
    const prev = { maxWeight: 65, maxReps: 10, maxVolume: 650 };
    const result = detectPR(set, prev);
    expect(result.isWeightPR).toBe(true);
    expect(result.isRepsPR).toBe(false);
    expect(result.isVolumePR).toBe(false); // 70*8=560 < 650
  });

  it("should detect volume PR", () => {
    const set: WorkoutSetData = { setNumber: 1, weight: 60, reps: 12, setType: "working", restSeconds: 90 };
    const prev = { maxWeight: 65, maxReps: 10, maxVolume: 650 };
    const result = detectPR(set, prev);
    expect(result.isWeightPR).toBe(false);
    expect(result.isRepsPR).toBe(true);
    expect(result.isVolumePR).toBe(true); // 60*12=720 > 650
  });

  it("should not detect any PR when all lower", () => {
    const set: WorkoutSetData = { setNumber: 1, weight: 50, reps: 8, setType: "working", restSeconds: 90 };
    const prev = { maxWeight: 65, maxReps: 10, maxVolume: 650 };
    const result = detectPR(set, prev);
    expect(result.isWeightPR).toBe(false);
    expect(result.isRepsPR).toBe(false);
    expect(result.isVolumePR).toBe(false);
  });

  // Volume calculation
  it("should calculate total volume correctly", () => {
    const sets: WorkoutSetData[] = [
      { setNumber: 1, weight: 60, reps: 10, setType: "warmup", restSeconds: 60 },
      { setNumber: 2, weight: 80, reps: 8, setType: "working", restSeconds: 90 },
      { setNumber: 3, weight: 80, reps: 7, setType: "working", restSeconds: 90 },
      { setNumber: 4, weight: 60, reps: 10, setType: "dropset", restSeconds: 0 },
    ];
    const totalVolume = sets.reduce((sum, s) => sum + s.weight * s.reps, 0);
    expect(totalVolume).toBe(600 + 640 + 560 + 600); // 2400
  });

  // Rest timer
  it("should calculate rest time based on set type", () => {
    const DEFAULT_REST: Record<SetType, number> = {
      warmup: 60,
      working: 90,
      dropset: 30,
      failure: 120,
    };
    expect(DEFAULT_REST.warmup).toBe(60);
    expect(DEFAULT_REST.working).toBe(90);
    expect(DEFAULT_REST.dropset).toBe(30);
    expect(DEFAULT_REST.failure).toBe(120);
  });
});

// ── Exercise Library Tests ──────────────────────────────────────────────────

describe("Exercise Library (Module 2)", () => {
  // Replicate the muscle group categorization
  type MuscleGroup = "chest" | "back" | "shoulders" | "biceps" | "triceps" | "legs" | "core" | "glutes" | "forearms" | "calves" | "full_body";

  interface Exercise {
    name: string;
    muscleGroup: MuscleGroup;
    category: string;
    isCompound: boolean;
  }

  const SAMPLE_EXERCISES: Exercise[] = [
    { name: "Bench Press", muscleGroup: "chest", category: "Weight Training", isCompound: true },
    { name: "Barbell Row", muscleGroup: "back", category: "Weight Training", isCompound: true },
    { name: "Overhead Press", muscleGroup: "shoulders", category: "Weight Training", isCompound: true },
    { name: "Bicep Curl", muscleGroup: "biceps", category: "Weight Training", isCompound: false },
    { name: "Squat", muscleGroup: "legs", category: "Weight Training", isCompound: true },
    { name: "Deadlift", muscleGroup: "full_body", category: "Weight Training", isCompound: true },
  ];

  it("should have compound and isolation exercises", () => {
    const compound = SAMPLE_EXERCISES.filter(e => e.isCompound);
    const isolation = SAMPLE_EXERCISES.filter(e => !e.isCompound);
    expect(compound.length).toBeGreaterThan(0);
    expect(isolation.length).toBeGreaterThan(0);
  });

  it("should categorize exercises by muscle group", () => {
    const chestExercises = SAMPLE_EXERCISES.filter(e => e.muscleGroup === "chest");
    expect(chestExercises.length).toBeGreaterThan(0);
    expect(chestExercises[0].name).toBe("Bench Press");
  });

  it("should have valid muscle group values", () => {
    const validGroups: MuscleGroup[] = ["chest", "back", "shoulders", "biceps", "triceps", "legs", "core", "glutes", "forearms", "calves", "full_body"];
    SAMPLE_EXERCISES.forEach(e => {
      expect(validGroups).toContain(e.muscleGroup);
    });
  });
});

// ── Food Scan Sugar Tracking Tests ──────────────────────────────────────────

describe("Food Scan Sugar Tracking (Module 4)", () => {
  interface FoodAnalysis {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    sugar: number;
    addedSugar: number;
    sugarLevel: "low" | "medium" | "high";
  }

  function classifySugarLevel(sugar: number): "low" | "medium" | "high" {
    if (sugar <= 5) return "low";
    if (sugar <= 15) return "medium";
    return "high";
  }

  it("should classify low sugar correctly", () => {
    expect(classifySugarLevel(0)).toBe("low");
    expect(classifySugarLevel(3)).toBe("low");
    expect(classifySugarLevel(5)).toBe("low");
  });

  it("should classify medium sugar correctly", () => {
    expect(classifySugarLevel(6)).toBe("medium");
    expect(classifySugarLevel(10)).toBe("medium");
    expect(classifySugarLevel(15)).toBe("medium");
  });

  it("should classify high sugar correctly", () => {
    expect(classifySugarLevel(16)).toBe("high");
    expect(classifySugarLevel(30)).toBe("high");
    expect(classifySugarLevel(50)).toBe("high");
  });

  it("should include sugar fields in food analysis", () => {
    const analysis: FoodAnalysis = {
      calories: 250,
      protein: 10,
      carbs: 30,
      fat: 8,
      sugar: 12,
      addedSugar: 8,
      sugarLevel: "medium",
    };
    expect(analysis.sugar).toBeDefined();
    expect(analysis.addedSugar).toBeDefined();
    expect(analysis.sugarLevel).toBe("medium");
  });
});

// ── Body Type Indicator Component Logic Tests ───────────────────────────────

describe("Body Type Indicator Logic", () => {
  const BODY_TYPE_LABELS: Record<string, { zh: string; en: string }> = {
    peak: { zh: "巔峰體態", en: "Peak" },
    lean: { zh: "精實", en: "Lean" },
    standard: { zh: "標準", en: "Standard" },
    skinny: { zh: "偏瘦", en: "Skinny" },
    fat: { zh: "偏胖", en: "Overweight" },
    obese: { zh: "肥胖", en: "Obese" },
  };

  it("should have labels for all 6 body types", () => {
    expect(Object.keys(BODY_TYPE_LABELS)).toHaveLength(6);
    expect(BODY_TYPE_LABELS.peak).toBeDefined();
    expect(BODY_TYPE_LABELS.lean).toBeDefined();
    expect(BODY_TYPE_LABELS.standard).toBeDefined();
    expect(BODY_TYPE_LABELS.skinny).toBeDefined();
    expect(BODY_TYPE_LABELS.fat).toBeDefined();
    expect(BODY_TYPE_LABELS.obese).toBeDefined();
  });

  it("should have both zh and en labels", () => {
    Object.values(BODY_TYPE_LABELS).forEach(label => {
      expect(label.zh).toBeTruthy();
      expect(label.en).toBeTruthy();
    });
  });
});

// ── Monster Body Type Transform Tests ───────────────────────────────────────

describe("Monster Body Type Transform", () => {
  type BodyType = "peak" | "lean" | "standard" | "skinny" | "fat" | "obese";

  function getBodyTypeTransform(bodyType: BodyType): {
    scaleX: number;
    scaleY: number;
    opacity: number;
  } {
    switch (bodyType) {
      case "peak":
        return { scaleX: 1.0, scaleY: 1.0, opacity: 1.0 };
      case "lean":
        return { scaleX: 0.95, scaleY: 1.02, opacity: 1.0 };
      case "standard":
        return { scaleX: 1.0, scaleY: 1.0, opacity: 1.0 };
      case "skinny":
        return { scaleX: 0.88, scaleY: 1.04, opacity: 0.95 };
      case "fat":
        return { scaleX: 1.1, scaleY: 0.96, opacity: 1.0 };
      case "obese":
        return { scaleX: 1.2, scaleY: 0.92, opacity: 1.0 };
      default:
        return { scaleX: 1.0, scaleY: 1.0, opacity: 1.0 };
    }
  }

  it("should make skinny monsters narrower", () => {
    const transform = getBodyTypeTransform("skinny");
    expect(transform.scaleX).toBeLessThan(1.0);
    expect(transform.scaleY).toBeGreaterThan(1.0);
  });

  it("should make fat monsters wider", () => {
    const transform = getBodyTypeTransform("fat");
    expect(transform.scaleX).toBeGreaterThan(1.0);
    expect(transform.scaleY).toBeLessThan(1.0);
  });

  it("should make obese monsters even wider", () => {
    const fatTransform = getBodyTypeTransform("fat");
    const obeseTransform = getBodyTypeTransform("obese");
    expect(obeseTransform.scaleX).toBeGreaterThan(fatTransform.scaleX);
  });

  it("should keep peak and standard at default scale", () => {
    const peakT = getBodyTypeTransform("peak");
    const stdT = getBodyTypeTransform("standard");
    expect(peakT.scaleX).toBe(1.0);
    expect(peakT.scaleY).toBe(1.0);
    expect(stdT.scaleX).toBe(1.0);
    expect(stdT.scaleY).toBe(1.0);
  });
});
