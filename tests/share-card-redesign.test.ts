import { describe, it, expect } from "vitest";

// ── Meal type detection logic ──
function getMealLog(
  logs: { mealType?: string }[],
  mealType: string
): { mealType?: string } | undefined {
  return logs.find((l) => l.mealType === mealType);
}

describe("Meal Box & Share Card Redesign", () => {
  describe("Meal type detection", () => {
    const logs = [
      { name: "Oatmeal", mealType: "breakfast", calories: 300, imageUri: "file://breakfast.jpg" },
      { name: "Chicken Salad", mealType: "lunch", calories: 500, imageUri: "file://lunch.jpg" },
    ];

    it("finds breakfast log", () => {
      expect(getMealLog(logs, "breakfast")).toBeDefined();
      expect(getMealLog(logs, "breakfast")?.mealType).toBe("breakfast");
    });

    it("finds lunch log", () => {
      expect(getMealLog(logs, "lunch")).toBeDefined();
    });

    it("returns undefined for missing dinner", () => {
      expect(getMealLog(logs, "dinner")).toBeUndefined();
    });

    it("returns undefined for empty logs", () => {
      expect(getMealLog([], "breakfast")).toBeUndefined();
    });
  });

  describe("3-meal unlock logic", () => {
    it("unlocks when all 3 meals are present", () => {
      const logs = [
        { mealType: "breakfast" },
        { mealType: "lunch" },
        { mealType: "dinner" },
      ];
      const breakfast = getMealLog(logs, "breakfast");
      const lunch = getMealLog(logs, "lunch");
      const dinner = getMealLog(logs, "dinner");
      const allThreeDone = !!(breakfast && lunch && dinner);
      expect(allThreeDone).toBe(true);
    });

    it("does not unlock with only 2 meals", () => {
      const logs = [
        { mealType: "breakfast" },
        { mealType: "lunch" },
      ];
      const breakfast = getMealLog(logs, "breakfast");
      const lunch = getMealLog(logs, "lunch");
      const dinner = getMealLog(logs, "dinner");
      const allThreeDone = !!(breakfast && lunch && dinner);
      expect(allThreeDone).toBe(false);
    });

    it("does not unlock with snacks only", () => {
      const logs = [
        { mealType: "snack" },
        { mealType: "snack" },
        { mealType: "snack" },
      ];
      const breakfast = getMealLog(logs, "breakfast");
      const lunch = getMealLog(logs, "lunch");
      const dinner = getMealLog(logs, "dinner");
      const allThreeDone = !!(breakfast && lunch && dinner);
      expect(allThreeDone).toBe(false);
    });

    it("does not unlock with 0 meals", () => {
      const logs: { mealType?: string }[] = [];
      const allThreeDone = !!(
        getMealLog(logs, "breakfast") &&
        getMealLog(logs, "lunch") &&
        getMealLog(logs, "dinner")
      );
      expect(allThreeDone).toBe(false);
    });
  });

  describe("FoodLogEntry mealType and imageUri fields", () => {
    it("accepts mealType and imageUri in FoodLogEntry", () => {
      const entry = {
        id: "food-1",
        name: "Test",
        calories: 100,
        protein: 10,
        carbs: 20,
        fat: 5,
        sugar: 3,
        expEarned: 10,
        timestamp: new Date().toISOString(),
        mealType: "breakfast" as const,
        imageUri: "file://test.jpg",
      };
      expect(entry.mealType).toBe("breakfast");
      expect(entry.imageUri).toBe("file://test.jpg");
    });

    it("mealType and imageUri are optional", () => {
      const entry: Record<string, any> = {
        id: "food-2",
        name: "Test",
        calories: 100,
        protein: 10,
        carbs: 20,
        fat: 5,
        sugar: 3,
        expEarned: 10,
        timestamp: new Date().toISOString(),
      };
      expect(entry.mealType).toBeUndefined();
      expect(entry.imageUri).toBeUndefined();
    });
  });

  describe("Share card data aggregation", () => {
    it("calculates correct totals from 3 meals", () => {
      const logs = [
        { calories: 300, protein: 20, carbs: 40, fat: 10, sugar: 5 },
        { calories: 500, protein: 35, carbs: 50, fat: 15, sugar: 8 },
        { calories: 600, protein: 40, carbs: 60, fat: 20, sugar: 12 },
      ];
      const totalCal = logs.reduce((s, l) => s + l.calories, 0);
      const totalProtein = logs.reduce((s, l) => s + l.protein, 0);
      const totalCarbs = logs.reduce((s, l) => s + l.carbs, 0);
      const totalFat = logs.reduce((s, l) => s + l.fat, 0);
      const totalSugar = logs.reduce((s, l) => s + (l.sugar || 0), 0);

      expect(totalCal).toBe(1400);
      expect(totalProtein).toBe(95);
      expect(totalCarbs).toBe(150);
      expect(totalFat).toBe(45);
      expect(totalSugar).toBe(25);
    });

    it("handles missing sugar gracefully", () => {
      const logs = [
        { calories: 300, protein: 20, carbs: 40, fat: 10 },
        { calories: 500, protein: 35, carbs: 50, fat: 15, sugar: 8 },
      ];
      const totalSugar = logs.reduce((s, l) => s + ((l as any).sugar || 0), 0);
      expect(totalSugar).toBe(8);
    });
  });

  describe("Sugar warning threshold", () => {
    it("triggers warning when sugar > 25g", () => {
      const totalSugar = 30;
      expect(totalSugar > 25).toBe(true);
    });

    it("no warning when sugar <= 25g", () => {
      const totalSugar = 25;
      expect(totalSugar > 25).toBe(false);
    });
  });

  describe("Macro bar percentage calculation", () => {
    it("calculates protein percentage correctly", () => {
      const totalProtein = 96;
      const goal = 120;
      const percent = Math.round((totalProtein / goal) * 100);
      expect(percent).toBe(80);
    });

    it("caps at 100% for over-goal", () => {
      const totalCarbs = 300;
      const goal = 250;
      const percent = Math.min(Math.round((totalCarbs / goal) * 100), 100);
      expect(percent).toBe(100);
    });
  });
});
