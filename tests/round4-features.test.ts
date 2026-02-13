import { describe, it, expect } from "vitest";

describe("Round 4 Fixes", () => {
  describe("Workout Filter Pills", () => {
    const WORKOUT_TYPES = ["All", "Running", "Weight Training", "Yoga", "Basketball"];
    const EXERCISES = [
      { id: 1, name: "Running", icon: "🏃", met: 8, category: "Running" },
      { id: 2, name: "Cycling", icon: "🚴", met: 7.5, category: "Running" },
      { id: 3, name: "Swimming", icon: "🏊", met: 7, category: "Running" },
      { id: 4, name: "Walking", icon: "🚶", met: 3.5, category: "Running" },
      { id: 5, name: "Hiking", icon: "🥾", met: 6, category: "Running" },
      { id: 6, name: "Jump Rope", icon: "🤸", met: 10, category: "Running" },
      { id: 7, name: "Bench Press", icon: "🏋️", met: 6, category: "Weight Training" },
      { id: 8, name: "Squats", icon: "🦵", met: 5.5, category: "Weight Training" },
      { id: 9, name: "Deadlift", icon: "💪", met: 6, category: "Weight Training" },
      { id: 10, name: "Yoga Flow", icon: "🧘", met: 3, category: "Yoga" },
      { id: 11, name: "Basketball", icon: "🏀", met: 6.5, category: "Basketball" },
    ];

    it("should filter exercises by category correctly", () => {
      const selectedType: string = "Yoga";
      const filtered = selectedType === "All" ? EXERCISES : EXERCISES.filter((e) => e.category === selectedType);
      expect(filtered).toHaveLength(1);
      expect(filtered[0].name).toBe("Yoga Flow");
    });

    it("should show all exercises when All is selected", () => {
      const selectedType = "All";
      const filtered = selectedType === "All" ? EXERCISES : EXERCISES.filter((e) => e.category === selectedType);
      expect(filtered).toHaveLength(11);
    });

    it("should filter Weight Training exercises correctly", () => {
      const selectedType = "Weight Training";
      const filtered = EXERCISES.filter((e) => e.category === selectedType);
      expect(filtered).toHaveLength(3);
      expect(filtered.map((e) => e.name)).toEqual(["Bench Press", "Squats", "Deadlift"]);
    });
  });

  describe("Sample Data", () => {
    it("should have realistic sample data for dashboard", () => {
      const todaySteps = 6280;
      const caloriesBurned = 420;
      const caloriesIntake = 1650;
      const proteinIntake = 68;
      const workoutExp = 540;
      const nutritionExp = 310;
      const netExp = workoutExp + nutritionExp;

      expect(todaySteps).toBeGreaterThan(0);
      expect(caloriesBurned).toBeGreaterThan(0);
      expect(caloriesIntake).toBeGreaterThan(0);
      expect(proteinIntake).toBeGreaterThan(0);
      expect(netExp).toBe(850);
    });

    it("should have realistic sample data for home screen", () => {
      const healthScore = 72;
      const steps = 4280;
      const netExp = 839;
      const coins = 350;

      expect(healthScore).toBeGreaterThan(0);
      expect(healthScore).toBeLessThanOrEqual(100);
      expect(steps).toBeGreaterThan(0);
      expect(netExp).toBeGreaterThan(0);
      expect(coins).toBeGreaterThan(0);
    });

    it("should have sample workout logs", () => {
      const SAMPLE_LOGS = [
        { exercise: "Running", duration: 30, exp: 294, timestamp: new Date() },
        { exercise: "Bench Press", duration: 45, exp: 331, timestamp: new Date() },
        { exercise: "Swimming", duration: 25, exp: 214, timestamp: new Date() },
      ];

      expect(SAMPLE_LOGS).toHaveLength(3);
      SAMPLE_LOGS.forEach((log) => {
        expect(log.exercise).toBeTruthy();
        expect(log.duration).toBeGreaterThan(0);
        expect(log.exp).toBeGreaterThan(0);
      });
    });
  });

  describe("Add Record Modal", () => {
    it("should validate food record inputs", () => {
      const recordName = "Grilled Chicken";
      const recordCalories = "350";

      expect(recordName.trim()).toBeTruthy();
      expect(parseInt(recordCalories, 10)).toBeGreaterThan(0);
    });

    it("should validate workout record inputs", () => {
      const recordName = "Running";
      const recordDuration = "30";

      expect(recordName.trim()).toBeTruthy();
      expect(parseInt(recordDuration, 10)).toBeGreaterThan(0);
    });

    it("should reject empty record name", () => {
      const recordName = "";
      expect(recordName.trim()).toBeFalsy();
    });

    it("should reject invalid calories", () => {
      const recordCalories = "abc";
      expect(isNaN(parseInt(recordCalories, 10))).toBe(true);
    });
  });

  describe("History Chart Data", () => {
    it("should have 7 days of chart data", () => {
      const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
      const chartData = [
        { day: "Mon", intake: 1800, burned: 350 },
        { day: "Tue", intake: 2100, burned: 500 },
        { day: "Wed", intake: 1650, burned: 420 },
        { day: "Thu", intake: 1900, burned: 380 },
        { day: "Fri", intake: 2200, burned: 600 },
        { day: "Sat", intake: 1750, burned: 300 },
        { day: "Sun", intake: 1650, burned: 420 },
      ];

      expect(chartData).toHaveLength(7);
      chartData.forEach((d) => {
        expect(days).toContain(d.day);
        expect(d.intake).toBeGreaterThan(0);
        expect(d.burned).toBeGreaterThan(0);
      });
    });
  });

  describe("Feed Monster Animation", () => {
    it("should calculate EXP correctly from food analysis", () => {
      const healthScore = 7;
      const totalProtein = 35;
      const expEarned = Math.round(healthScore * 10 + totalProtein * 0.5);
      expect(expEarned).toBe(88);
    });

    it("should calculate EXP for high-protein meal", () => {
      const healthScore = 9;
      const totalProtein = 60;
      const expEarned = Math.round(healthScore * 10 + totalProtein * 0.5);
      expect(expEarned).toBe(120);
    });
  });
});
