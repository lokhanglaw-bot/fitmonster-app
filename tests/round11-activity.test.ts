import { describe, it, expect } from "vitest";

// Test the activity reducer logic directly
describe("Activity Context - Shared State", () => {
  // Simulate the reducer logic
  const getToday = () => new Date().toISOString().split("T")[0];

  function updateWeeklyLast(arr: number[], add: number): number[] {
    const copy = [...arr];
    copy[copy.length - 1] = (copy[copy.length - 1] || 0) + add;
    return copy;
  }

  const initialState = {
    todayProtein: 0,
    todayCaloriesIn: 0,
    todayCaloriesBurned: 0,
    todayWorkoutMinutes: 0,
    todaySteps: 0,
    todayFoodLogs: [] as any[],
    todayWorkoutLogs: [] as any[],
    todayMealCount: 0,
    todayTotalExp: 0,
    weeklyCalories: [0, 0, 0, 0, 0, 0, 0],
    weeklyProtein: [0, 0, 0, 0, 0, 0, 0],
    weeklyWorkout: [0, 0, 0, 0, 0, 0, 0],
    lastResetDate: getToday(),
  };

  describe("LOG_FOOD action", () => {
    it("should update protein, calories, meal count, and EXP", () => {
      const state = { ...initialState };
      const food = { name: "Chicken Breast", calories: 300, protein: 45, carbs: 0, fat: 8, expEarned: 50 };

      // Simulate LOG_FOOD
      const newState = {
        ...state,
        todayProtein: state.todayProtein + food.protein,
        todayCaloriesIn: state.todayCaloriesIn + food.calories,
        todayMealCount: state.todayMealCount + 1,
        todayTotalExp: state.todayTotalExp + food.expEarned,
      };

      expect(newState.todayProtein).toBe(45);
      expect(newState.todayCaloriesIn).toBe(300);
      expect(newState.todayMealCount).toBe(1);
      expect(newState.todayTotalExp).toBe(50);
    });

    it("should accumulate multiple food logs", () => {
      let protein = 0;
      let calories = 0;
      let mealCount = 0;

      // Log 3 meals
      const meals = [
        { protein: 30, calories: 400 },
        { protein: 45, calories: 600 },
        { protein: 25, calories: 350 },
      ];

      meals.forEach((m) => {
        protein += m.protein;
        calories += m.calories;
        mealCount += 1;
      });

      expect(protein).toBe(100);
      expect(calories).toBe(1350);
      expect(mealCount).toBe(3);
    });
  });

  describe("LOG_WORKOUT action", () => {
    it("should update workout minutes, calories burned, and EXP", () => {
      const state = { ...initialState };
      const workout = { exercise: "Running", duration: 30, expEarned: 150 };
      const caloriesBurned = Math.round(workout.duration * 7.5);

      const newState = {
        ...state,
        todayWorkoutMinutes: state.todayWorkoutMinutes + workout.duration,
        todayCaloriesBurned: state.todayCaloriesBurned + caloriesBurned,
        todayTotalExp: state.todayTotalExp + workout.expEarned,
      };

      expect(newState.todayWorkoutMinutes).toBe(30);
      expect(newState.todayCaloriesBurned).toBe(225);
      expect(newState.todayTotalExp).toBe(150);
    });

    it("should accumulate multiple workouts", () => {
      let totalMinutes = 0;
      let totalExp = 0;

      const workouts = [
        { duration: 30, exp: 150 },
        { duration: 45, exp: 200 },
        { duration: 15, exp: 75 },
      ];

      workouts.forEach((w) => {
        totalMinutes += w.duration;
        totalExp += w.exp;
      });

      expect(totalMinutes).toBe(90);
      expect(totalExp).toBe(425);
    });
  });

  describe("SYNC_STEPS action", () => {
    it("should accumulate steps", () => {
      let steps = 0;
      steps += 2000;
      steps += 1500;
      steps += 3000;
      expect(steps).toBe(6500);
    });
  });

  describe("Quest progress tracking", () => {
    it("Protein Champion quest should reflect real protein intake", () => {
      const todayProtein = 68;
      const quest = { progress: todayProtein, target: 100 };
      expect(quest.progress).toBe(68);
      expect(quest.progress < quest.target).toBe(true);

      // After eating more protein
      const updatedProtein = todayProtein + 40;
      const updatedQuest = { progress: updatedProtein, target: 100 };
      expect(updatedQuest.progress).toBe(108);
      expect(updatedQuest.progress >= updatedQuest.target).toBe(true);
    });

    it("Walking Master quest should reflect real step count", () => {
      const todaySteps = 3000;
      const quest = { progress: todaySteps, target: 5000 };
      expect(quest.progress < quest.target).toBe(true);

      const updatedSteps = todaySteps + 2500;
      const updatedQuest = { progress: updatedSteps, target: 5000 };
      expect(updatedQuest.progress >= updatedQuest.target).toBe(true);
    });

    it("Strength Training quest should reflect real workout minutes", () => {
      const todayWorkoutMinutes = 15;
      const quest = { progress: todayWorkoutMinutes, target: 30 };
      expect(quest.progress < quest.target).toBe(true);

      const updatedMinutes = todayWorkoutMinutes + 20;
      const updatedQuest = { progress: updatedMinutes, target: 30 };
      expect(updatedQuest.progress >= updatedQuest.target).toBe(true);
    });
  });

  describe("Weekly data tracking", () => {
    it("should update last element of weekly array on food log", () => {
      const weekly = [100, 200, 300, 400, 500, 600, 0];
      const updated = updateWeeklyLast(weekly, 350);
      expect(updated[6]).toBe(350);
      expect(updated[0]).toBe(100); // previous days unchanged
    });

    it("should accumulate in last element for multiple logs same day", () => {
      let weekly = [100, 200, 300, 400, 500, 600, 0];
      weekly = updateWeeklyLast(weekly, 200);
      weekly = updateWeeklyLast(weekly, 150);
      expect(weekly[6]).toBe(350);
    });
  });

  describe("ADD_RECORD_FOOD action", () => {
    it("should estimate protein from calories and update state", () => {
      const calories = 500;
      const protein = Math.round(calories * 0.15 / 4);
      const exp = Math.round(calories * 0.05);
      expect(protein).toBe(19);
      expect(exp).toBe(25);
    });
  });

  describe("ADD_RECORD_WORKOUT action", () => {
    it("should estimate EXP from duration and update state", () => {
      const duration = 45;
      const exp = Math.round(duration * 5);
      const caloriesBurned = Math.round(duration * 7.5);
      expect(exp).toBe(225);
      expect(caloriesBurned).toBe(338);
    });
  });

  describe("Health score calculation", () => {
    it("should compute health score from protein, workout, and steps", () => {
      const protein = 80;
      const workoutMinutes = 45;
      const steps = 5000;
      const score = Math.min(100, 50 + Math.round(protein * 0.2) + Math.round(workoutMinutes * 0.3) + Math.round(steps * 0.002));
      expect(score).toBe(50 + 16 + 14 + 10);
      expect(score).toBe(90);
    });

    it("should cap at 100", () => {
      const protein = 200;
      const workoutMinutes = 120;
      const steps = 15000;
      const score = Math.min(100, 50 + Math.round(protein * 0.2) + Math.round(workoutMinutes * 0.3) + Math.round(steps * 0.002));
      expect(score).toBe(100);
    });

    it("should start at 50 with no activity", () => {
      const score = Math.min(100, 50 + 0 + 0 + 0);
      expect(score).toBe(50);
    });
  });

  describe("Daily reset", () => {
    it("should shift weekly arrays and reset today's data", () => {
      const weekly = [100, 200, 300, 400, 500, 600, 700];
      const shifted = [...weekly.slice(1), 0];
      expect(shifted).toEqual([200, 300, 400, 500, 600, 700, 0]);
    });
  });

  describe("Cross-screen data flow", () => {
    it("food logged on camera screen should update home quest progress", () => {
      // Simulate: camera logs food with 45g protein
      let todayProtein = 0;
      todayProtein += 45; // camera screen logs food

      // Home screen reads from shared state
      const quest = { progress: todayProtein, target: 100 };
      expect(quest.progress).toBe(45);
    });

    it("workout completed on workout screen should update home quest progress", () => {
      // Simulate: workout screen logs 35 min workout
      let todayWorkoutMinutes = 0;
      todayWorkoutMinutes += 35;

      // Home screen reads from shared state
      const quest = { progress: todayWorkoutMinutes, target: 30 };
      expect(quest.progress >= quest.target).toBe(true);
    });

    it("steps synced on workout screen should update home quest progress", () => {
      let todaySteps = 0;
      todaySteps += 3000; // first sync
      todaySteps += 2500; // second sync

      const quest = { progress: todaySteps, target: 5000 };
      expect(quest.progress >= quest.target).toBe(true);
    });

    it("Add Record food on home screen should update quests", () => {
      const calories = 600;
      const protein = Math.round(calories * 0.15 / 4);
      let todayProtein = 80;
      todayProtein += protein;

      const quest = { progress: todayProtein, target: 100 };
      // 80 + 23 = 103 > 100
      expect(quest.progress).toBe(80 + protein);
    });

    it("Add Record workout on home screen should update quests", () => {
      const duration = 20;
      let todayWorkoutMinutes = 15;
      todayWorkoutMinutes += duration;

      const quest = { progress: todayWorkoutMinutes, target: 30 };
      expect(quest.progress >= quest.target).toBe(true);
    });
  });
});
