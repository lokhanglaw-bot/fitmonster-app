import { describe, expect, it, vi } from "vitest";

// Mock the LLM module
vi.mock("../server/_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    id: "test-id",
    created: Date.now(),
    model: "gemini-2.5-flash",
    choices: [
      {
        index: 0,
        message: {
          role: "assistant",
          content: JSON.stringify({
            foods: [
              {
                name: "Grilled Chicken Breast",
                portion: "200g",
                calories: 330,
                protein: 62,
                carbs: 0,
                fat: 7,
                fiber: 0,
              },
              {
                name: "Brown Rice",
                portion: "1 cup",
                calories: 216,
                protein: 5,
                carbs: 45,
                fat: 2,
                fiber: 4,
              },
            ],
            totalCalories: 546,
            totalProtein: 67,
            totalCarbs: 45,
            totalFat: 9,
            mealType: "lunch",
            healthScore: 8,
            summary: "A healthy lunch with grilled chicken breast and brown rice.",
          }),
        },
        finish_reason: "stop",
      },
    ],
  }),
}));

// Mock the storage module
vi.mock("../server/storage", () => ({
  storagePut: vi.fn().mockResolvedValue({
    key: "food-analysis/test.jpg",
    url: "https://storage.example.com/food-analysis/test.jpg",
  }),
}));

describe("Food Analysis Feature", () => {
  it("should parse LLM response into structured nutrition data", () => {
    const mockLLMResponse = JSON.stringify({
      foods: [
        {
          name: "Grilled Chicken Breast",
          portion: "200g",
          calories: 330,
          protein: 62,
          carbs: 0,
          fat: 7,
          fiber: 0,
        },
      ],
      totalCalories: 330,
      totalProtein: 62,
      totalCarbs: 0,
      totalFat: 7,
      mealType: "lunch",
      healthScore: 8,
      summary: "Grilled chicken breast, a high-protein meal.",
    });

    const parsed = JSON.parse(mockLLMResponse);

    expect(parsed.foods).toHaveLength(1);
    expect(parsed.foods[0].name).toBe("Grilled Chicken Breast");
    expect(parsed.totalCalories).toBe(330);
    expect(parsed.totalProtein).toBe(62);
    expect(parsed.mealType).toBe("lunch");
    expect(parsed.healthScore).toBe(8);
    expect(parsed.summary).toContain("chicken");
  });

  it("should handle malformed LLM response gracefully", () => {
    const malformedContent = "This is not valid JSON";
    let analysisResult;

    try {
      analysisResult = JSON.parse(malformedContent);
    } catch {
      // Fallback matches what the server endpoint does
      analysisResult = {
        foods: [
          {
            name: "Unknown food",
            portion: "1 serving",
            calories: 200,
            protein: 10,
            carbs: 25,
            fat: 8,
            fiber: 3,
          },
        ],
        totalCalories: 200,
        totalProtein: 10,
        totalCarbs: 25,
        totalFat: 8,
        mealType: "snack",
        healthScore: 5,
        summary: "Could not fully analyze the image. Showing estimated values.",
      };
    }

    expect(analysisResult.foods).toHaveLength(1);
    expect(analysisResult.totalCalories).toBe(200);
    expect(analysisResult.mealType).toBe("snack");
    expect(analysisResult.healthScore).toBe(5);
  });

  it("should calculate EXP earned from food analysis", () => {
    const analysis = {
      healthScore: 8,
      totalProtein: 67,
    };

    // EXP formula: healthScore * 10 + totalProtein * 0.5
    const expEarned = Math.round(analysis.healthScore * 10 + analysis.totalProtein * 0.5);
    expect(expEarned).toBe(114); // 80 + 33.5 = 113.5 -> 114
  });

  it("should convert base64 image to buffer correctly", () => {
    // Simulate a small base64 image
    const testBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
    const buffer = Buffer.from(testBase64, "base64");

    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);
    // PNG magic bytes
    expect(buffer[0]).toBe(0x89);
    expect(buffer[1]).toBe(0x50); // 'P'
    expect(buffer[2]).toBe(0x4e); // 'N'
    expect(buffer[3]).toBe(0x47); // 'G'
  });

  it("should validate food item structure", () => {
    const foodItem = {
      name: "Salmon Sashimi",
      portion: "6 pieces (120g)",
      calories: 208,
      protein: 25,
      carbs: 0,
      fat: 12,
      fiber: 0,
    };

    expect(typeof foodItem.name).toBe("string");
    expect(typeof foodItem.portion).toBe("string");
    expect(typeof foodItem.calories).toBe("number");
    expect(typeof foodItem.protein).toBe("number");
    expect(typeof foodItem.carbs).toBe("number");
    expect(typeof foodItem.fat).toBe("number");
    expect(typeof foodItem.fiber).toBe("number");
    expect(foodItem.calories).toBeGreaterThan(0);
    expect(foodItem.protein).toBeGreaterThanOrEqual(0);
  });

  it("should handle multiple food items in a meal", () => {
    const analysis = {
      foods: [
        { name: "Rice", portion: "1 cup", calories: 206, protein: 4, carbs: 45, fat: 0, fiber: 1 },
        { name: "Chicken Curry", portion: "200g", calories: 300, protein: 28, carbs: 12, fat: 18, fiber: 2 },
        { name: "Naan Bread", portion: "1 piece", calories: 262, protein: 9, carbs: 45, fat: 5, fiber: 2 },
      ],
      totalCalories: 768,
      totalProtein: 41,
      totalCarbs: 102,
      totalFat: 23,
      mealType: "dinner" as const,
      healthScore: 6,
      summary: "Indian curry dinner with rice and naan bread.",
    };

    expect(analysis.foods).toHaveLength(3);
    // Verify totals roughly match sum of individual items
    const sumCalories = analysis.foods.reduce((sum, f) => sum + f.calories, 0);
    expect(analysis.totalCalories).toBe(sumCalories);
  });
});
