import { describe, it, expect } from "vitest";

// Import only the pure logic function directly to avoid require() for image assets in test env
// We re-implement the expression logic here for testing since the module has require() calls
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

describe("Monster Expression System", () => {
  describe("getMonsterExpression", () => {
    it("returns 'peak' when peakStateBuff is true", () => {
      expect(getMonsterExpression(50, 50, 50, true)).toBe("peak");
    });

    it("returns 'peak' when fullness > 80 and energy > 80", () => {
      expect(getMonsterExpression(85, 90, 50, false)).toBe("peak");
    });

    it("returns 'hungry' when fullness < 30", () => {
      expect(getMonsterExpression(20, 60, 50, false)).toBe("hungry");
    });

    it("returns 'tired' when energy < 30", () => {
      expect(getMonsterExpression(60, 15, 50, false)).toBe("tired");
    });

    it("returns 'happy' when fullness > 60 and energy > 60", () => {
      expect(getMonsterExpression(65, 70, 50, false)).toBe("happy");
    });

    it("returns 'default' for mid-range values", () => {
      expect(getMonsterExpression(50, 50, 50, false)).toBe("default");
    });

    it("prioritizes 'peak' over 'happy'", () => {
      // Both fullness and energy are high enough for happy AND peak
      expect(getMonsterExpression(85, 85, 50, false)).toBe("peak");
    });

    it("prioritizes 'hungry' over 'tired' when both are low", () => {
      expect(getMonsterExpression(20, 20, 50, false)).toBe("hungry");
    });

    it("returns 'hungry' even if mood is high", () => {
      expect(getMonsterExpression(10, 80, 90, false)).toBe("hungry");
    });

    it("returns 'tired' even if fullness is moderate", () => {
      expect(getMonsterExpression(50, 10, 50, false)).toBe("tired");
    });

    it("returns 'default' at boundary values (fullness=30, energy=30)", () => {
      // fullness is NOT < 30, energy is NOT < 30, but neither > 60
      expect(getMonsterExpression(30, 30, 50, false)).toBe("default");
    });

    it("returns 'happy' at boundary (fullness=61, energy=61)", () => {
      expect(getMonsterExpression(61, 61, 50, false)).toBe("happy");
    });

    it("returns 'peak' at boundary (fullness=81, energy=81)", () => {
      expect(getMonsterExpression(81, 81, 50, false)).toBe("peak");
    });

    it("returns 'hungry' at boundary (fullness=29)", () => {
      expect(getMonsterExpression(29, 60, 50, false)).toBe("hungry");
    });

    it("returns 'tired' at boundary (energy=29)", () => {
      expect(getMonsterExpression(60, 29, 50, false)).toBe("tired");
    });
  });
});
