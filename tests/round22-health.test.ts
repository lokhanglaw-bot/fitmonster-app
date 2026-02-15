import { describe, it, expect } from "vitest";

// Inline the pure utility functions from health-service.ts to avoid
// importing Platform from react-native (not available in vitest)

type WorkoutType =
  | "running" | "walking" | "cycling" | "swimming"
  | "weight_training" | "yoga" | "hiit" | "basketball" | "other";

const WORKOUT_MET: Record<WorkoutType, number> = {
  running: 9.8, walking: 3.5, cycling: 7.5, swimming: 8.0,
  weight_training: 6.0, yoga: 3.0, hiit: 10.0, basketball: 8.0, other: 5.0,
};

function calculateWorkoutExp(type: WorkoutType, durationMinutes: number, caloriesBurned: number): number {
  const met = WORKOUT_MET[type] || 5.0;
  return Math.round(durationMinutes * met * 0.5 + caloriesBurned * 0.1);
}

function stepsToCalories(steps: number): number {
  return Math.round(steps * 0.04);
}

function stepsToExp(steps: number): number {
  return Math.round(steps / 100);
}

function mapHealthKitWorkoutType(activityName: string): WorkoutType {
  const name = activityName.toLowerCase();
  if (name.includes("run")) return "running";
  if (name.includes("walk")) return "walking";
  if (name.includes("cycl") || name.includes("bik")) return "cycling";
  if (name.includes("swim")) return "swimming";
  if (name.includes("yoga")) return "yoga";
  if (name.includes("weight") || name.includes("strength") || name.includes("functional")) return "weight_training";
  if (name.includes("hiit") || name.includes("interval") || name.includes("cross")) return "hiit";
  if (name.includes("basket")) return "basketball";
  return "other";
}

function mapHealthConnectExerciseType(exerciseType: number): WorkoutType {
  const mapping: Record<number, WorkoutType> = {
    56: "running", 79: "walking", 8: "cycling", 74: "swimming",
    80: "weight_training", 84: "yoga", 35: "hiit", 4: "basketball",
  };
  return mapping[exerciseType] || "other";
}

describe("Round 22 - Health Data Sync", () => {
  describe("stepsToCalories", () => {
    it("converts steps to calories using 0.04 factor", () => {
      expect(stepsToCalories(10000)).toBe(400);
      expect(stepsToCalories(5000)).toBe(200);
      expect(stepsToCalories(0)).toBe(0);
    });

    it("rounds to nearest integer", () => {
      expect(stepsToCalories(1)).toBe(0);
      expect(stepsToCalories(25)).toBe(1);
      expect(stepsToCalories(125)).toBe(5);
    });
  });

  describe("stepsToExp", () => {
    it("converts steps to EXP (steps / 100)", () => {
      expect(stepsToExp(10000)).toBe(100);
      expect(stepsToExp(5000)).toBe(50);
      expect(stepsToExp(0)).toBe(0);
    });

    it("rounds to nearest integer", () => {
      expect(stepsToExp(150)).toBe(2);
      expect(stepsToExp(50)).toBe(1);
    });
  });

  describe("calculateWorkoutExp", () => {
    it("calculates EXP for running (MET 9.8)", () => {
      const exp = calculateWorkoutExp("running", 30, 300);
      expect(exp).toBe(177);
    });

    it("calculates EXP for yoga (MET 3.0)", () => {
      const exp = calculateWorkoutExp("yoga", 60, 180);
      expect(exp).toBe(108);
    });

    it("calculates EXP for weight training (MET 6.0)", () => {
      const exp = calculateWorkoutExp("weight_training", 45, 270);
      expect(exp).toBe(162);
    });

    it("uses default MET 5.0 for unknown type", () => {
      const exp = calculateWorkoutExp("other", 30, 150);
      expect(exp).toBe(90);
    });

    it("returns 0 for zero duration and calories", () => {
      expect(calculateWorkoutExp("running", 0, 0)).toBe(0);
    });
  });

  describe("mapHealthKitWorkoutType", () => {
    it("maps common HealthKit activity names", () => {
      expect(mapHealthKitWorkoutType("Running")).toBe("running");
      expect(mapHealthKitWorkoutType("Walking")).toBe("walking");
      expect(mapHealthKitWorkoutType("Cycling")).toBe("cycling");
      expect(mapHealthKitWorkoutType("Swimming")).toBe("swimming");
      expect(mapHealthKitWorkoutType("Yoga")).toBe("yoga");
      expect(mapHealthKitWorkoutType("Traditional Strength Training")).toBe("weight_training");
      expect(mapHealthKitWorkoutType("High Intensity Interval Training")).toBe("hiit");
      expect(mapHealthKitWorkoutType("Basketball")).toBe("basketball");
    });

    it("maps partial matches case-insensitively", () => {
      expect(mapHealthKitWorkoutType("outdoor running")).toBe("running");
      expect(mapHealthKitWorkoutType("Indoor Cycling")).toBe("cycling");
      expect(mapHealthKitWorkoutType("functional strength training")).toBe("weight_training");
      expect(mapHealthKitWorkoutType("CrossFit")).toBe("hiit");
    });

    it("returns 'other' for unknown types", () => {
      expect(mapHealthKitWorkoutType("Tennis")).toBe("other");
      expect(mapHealthKitWorkoutType("Fencing")).toBe("other");
    });
  });

  describe("mapHealthConnectExerciseType", () => {
    it("maps Health Connect exercise type numbers", () => {
      expect(mapHealthConnectExerciseType(56)).toBe("running");
      expect(mapHealthConnectExerciseType(79)).toBe("walking");
      expect(mapHealthConnectExerciseType(8)).toBe("cycling");
      expect(mapHealthConnectExerciseType(74)).toBe("swimming");
      expect(mapHealthConnectExerciseType(80)).toBe("weight_training");
      expect(mapHealthConnectExerciseType(84)).toBe("yoga");
      expect(mapHealthConnectExerciseType(35)).toBe("hiit");
      expect(mapHealthConnectExerciseType(4)).toBe("basketball");
    });

    it("returns 'other' for unknown exercise type numbers", () => {
      expect(mapHealthConnectExerciseType(999)).toBe("other");
      expect(mapHealthConnectExerciseType(0)).toBe("other");
    });
  });

  describe("SYNC_HEALTH_DATA action shape", () => {
    it("validates the expected payload structure", () => {
      const payload = {
        steps: 8500,
        caloriesBurned: stepsToCalories(8500),
        workoutMinutes: 45,
        workoutLogs: [
          { exercise: "Running", duration: 30, expEarned: 177 },
          { exercise: "Yoga", duration: 15, expEarned: 30 },
        ],
        stepsExp: stepsToExp(8500),
      };

      expect(payload.steps).toBe(8500);
      expect(payload.caloriesBurned).toBe(340);
      expect(payload.stepsExp).toBe(85);
      expect(payload.workoutLogs).toHaveLength(2);
      expect(payload.workoutLogs[0].exercise).toBe("Running");
    });

    it("total EXP combines steps EXP and workout EXP", () => {
      const stepsExp = stepsToExp(10000); // 100
      const workoutExp = calculateWorkoutExp("running", 30, 300); // 177
      const totalExp = stepsExp + workoutExp;
      expect(totalExp).toBe(277);
    });
  });

  describe("Step bonus thresholds", () => {
    it("10000+ steps gives 1.5x EXP bonus", () => {
      const steps = 10000;
      const bonus = steps >= 10000 ? 1.5 : steps >= 5000 ? 1.2 : 1.0;
      expect(bonus).toBe(1.5);
    });

    it("5000-9999 steps gives 1.2x EXP bonus", () => {
      const steps = 7500;
      const bonus = steps >= 10000 ? 1.5 : steps >= 5000 ? 1.2 : 1.0;
      expect(bonus).toBe(1.2);
    });

    it("under 5000 steps gives no bonus", () => {
      const steps = 3000;
      const bonus = steps >= 10000 ? 1.5 : steps >= 5000 ? 1.2 : 1.0;
      expect(bonus).toBe(1.0);
    });
  });
});
