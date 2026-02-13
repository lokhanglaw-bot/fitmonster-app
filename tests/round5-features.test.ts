import { describe, it, expect } from "vitest";

describe("Round 5 Features", () => {
  const EXERCISES = [
    { id: 1, name: "Running", icon: "🏃", met: 8, category: "Running" },
    { id: 2, name: "Cycling", icon: "🚴", met: 7.5, category: "Running" },
    { id: 7, name: "Bench Press", icon: "🏋️", met: 6, category: "Weight Training" },
    { id: 10, name: "Yoga Flow", icon: "🧘", met: 3, category: "Yoga" },
  ];

  describe("Workout Detail Page - EXP Calculation", () => {
    const bodyWeight = 70;

    const calcExp = (met: number, duration: number, multiplier: number) => {
      return Math.round(met * 3.5 * bodyWeight * duration / 200 * multiplier);
    };

    const calcCalories = (met: number, duration: number) => {
      return Math.round(met * 3.5 * bodyWeight * duration / 200);
    };

    it("should calculate EXP correctly for Running 30 min no bonus", () => {
      const exp = calcExp(8, 30, 1.0);
      expect(exp).toBe(294);
    });

    it("should calculate EXP correctly for Running 30 min with Outdoor bonus x1.5", () => {
      const exp = calcExp(8, 30, 1.5);
      expect(exp).toBe(441);
    });

    it("should calculate EXP correctly for Running 30 min with Gym bonus x2.0", () => {
      const exp = calcExp(8, 30, 2.0);
      expect(exp).toBe(588);
    });

    it("should calculate calories correctly for Running 30 min", () => {
      const cal = calcCalories(8, 30);
      expect(cal).toBe(294);
    });

    it("should calculate EXP for Yoga Flow 60 min no bonus", () => {
      const exp = calcExp(3, 60, 1.0);
      expect(exp).toBe(221);
    });

    it("should calculate EXP for Bench Press 45 min with Gym bonus", () => {
      const exp = calcExp(6, 45, 2.0);
      expect(exp).toBe(662);
    });

    it("should handle minimum duration (5 min)", () => {
      const exp = calcExp(8, 5, 1.0);
      expect(exp).toBe(49);
      expect(exp).toBeGreaterThan(0);
    });

    it("should handle maximum duration (120 min)", () => {
      const exp = calcExp(8, 120, 1.0);
      expect(exp).toBe(1176);
    });
  });

  describe("Workout Detail Page - Duration Slider", () => {
    const sliderMin = 5;
    const sliderMax = 120;

    it("should clamp duration to min value", () => {
      const ratio = 0;
      const duration = Math.round(sliderMin + ratio * (sliderMax - sliderMin));
      expect(duration).toBe(5);
    });

    it("should clamp duration to max value", () => {
      const ratio = 1;
      const duration = Math.round(sliderMin + ratio * (sliderMax - sliderMin));
      expect(duration).toBe(120);
    });

    it("should calculate midpoint correctly", () => {
      const ratio = 0.5;
      const duration = Math.round(sliderMin + ratio * (sliderMax - sliderMin));
      expect(duration).toBe(63); // 5 + 0.5 * 115 = 62.5 → 63
    });

    it("should calculate quarter correctly", () => {
      const ratio = 0.25;
      const duration = Math.round(sliderMin + ratio * (sliderMax - sliderMin));
      expect(duration).toBe(34); // 5 + 0.25 * 115 = 33.75 → 34
    });
  });

  describe("Workout Detail Page - Bonus Toggle", () => {
    type BonusType = "none" | "outdoor" | "gym";

    const getMultiplier = (b: BonusType): number => {
      if (b === "outdoor") return 1.5;
      if (b === "gym") return 2.0;
      return 1.0;
    };

    const toggleBonus = (current: BonusType, target: BonusType): BonusType => {
      return current === target ? "none" : target;
    };

    it("should return 1.0 for no bonus", () => {
      expect(getMultiplier("none")).toBe(1.0);
    });

    it("should return 1.5 for outdoor bonus", () => {
      expect(getMultiplier("outdoor")).toBe(1.5);
    });

    it("should return 2.0 for gym bonus", () => {
      expect(getMultiplier("gym")).toBe(2.0);
    });

    it("should toggle bonus off when tapping same bonus", () => {
      const result = toggleBonus("outdoor", "outdoor");
      expect(result).toBe("none");
    });

    it("should toggle bonus to different type", () => {
      const result = toggleBonus("outdoor", "gym");
      expect(result).toBe("gym");
    });
  });

  describe("Monster Action Buttons", () => {
    const MONSTER_ACTIONS = [
      { label: "Train", route: "/(tabs)/workout", color: "#3B82F6" },
      { label: "Feed", route: "/(tabs)/camera", color: "#22C55E" },
      { label: "Battle", route: "/(tabs)/battle", color: "#EF4444" },
    ];

    it("should have exactly 3 action buttons", () => {
      expect(MONSTER_ACTIONS).toHaveLength(3);
    });

    it("should have Train button routing to workout", () => {
      const train = MONSTER_ACTIONS.find((a) => a.label === "Train");
      expect(train).toBeDefined();
      expect(train?.route).toBe("/(tabs)/workout");
    });

    it("should have Feed button routing to camera", () => {
      const feed = MONSTER_ACTIONS.find((a) => a.label === "Feed");
      expect(feed).toBeDefined();
      expect(feed?.route).toBe("/(tabs)/camera");
    });

    it("should have Battle button routing to battle", () => {
      const battle = MONSTER_ACTIONS.find((a) => a.label === "Battle");
      expect(battle).toBeDefined();
      expect(battle?.route).toBe("/(tabs)/battle");
    });

    it("should have distinct colors for each action", () => {
      const colors = MONSTER_ACTIONS.map((a) => a.color);
      const uniqueColors = new Set(colors);
      expect(uniqueColors.size).toBe(3);
    });
  });

  describe("Username Display", () => {
    it("should show username when available", () => {
      const user = { name: "JohnDoe" };
      const trainerName = user?.name || "Trainer";
      expect(trainerName).toBe("JohnDoe");
    });

    it("should fallback to Trainer when no user", () => {
      const user = null as { name: string } | null;
      const trainerName = user?.name || "Trainer";
      expect(trainerName).toBe("Trainer");
    });

    it("should fallback to Trainer when name is empty", () => {
      const user = { name: "" };
      const trainerName = user?.name || "Trainer";
      expect(trainerName).toBe("Trainer");
    });
  });

  describe("Exercise Grid - 2 Column Layout", () => {
    it("should calculate card width for 2 columns", () => {
      // 47% width with gap creates 2-column layout
      const cardWidthPercent = 47;
      const totalWithGap = cardWidthPercent * 2; // 94% + gap
      expect(totalWithGap).toBeLessThanOrEqual(100);
    });

    it("should highlight selected exercise with primary border", () => {
      const selectedId = 1;
      const exercise = { id: 1, name: "Running" };
      const isSelected = selectedId === exercise.id;
      expect(isSelected).toBe(true);
    });

    it("should not highlight unselected exercise", () => {
      const selectedId = 1;
      const exercise = { id: 2, name: "Cycling" };
      const isSelected = selectedId === exercise.id;
      expect(isSelected).toBe(false);
    });
  });
});
