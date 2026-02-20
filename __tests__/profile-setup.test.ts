import { describe, it, expect } from "vitest";

// Test BMR calculation using Harris-Benedict formula
function calculateBMR(gender: "male" | "female", weight: number, height: number, age: number): number {
  if (gender === "male") {
    return Math.round(88.362 + (13.397 * weight) + (4.799 * height) - (5.677 * age));
  } else {
    return Math.round(447.593 + (9.247 * weight) + (3.098 * height) - (4.330 * age));
  }
}

// Test protein coefficient by monster type
function getProteinCoefficient(monsterType: string): number {
  switch (monsterType.toLowerCase()) {
    case "physique": return 1.2;
    case "bodybuilder": return 1.6;
    case "powerlifter": return 2.0;
    default: return 1.2;
  }
}

describe("BMR Calculation (Harris-Benedict)", () => {
  it("calculates BMR correctly for a male", () => {
    // Male: BMR = 88.362 + (13.397 × 70) + (4.799 × 175) - (5.677 × 25)
    // = 88.362 + 937.79 + 839.825 - 141.925 = 1724.052 → 1724
    const bmr = calculateBMR("male", 70, 175, 25);
    expect(bmr).toBe(1724);
  });

  it("calculates BMR correctly for a female", () => {
    // Female: BMR = 447.593 + (9.247 × 55) + (3.098 × 160) - (4.330 × 30)
    // = 447.593 + 508.585 + 495.68 - 129.9 = 1321.958 → 1322
    const bmr = calculateBMR("female", 55, 160, 30);
    expect(bmr).toBe(1322);
  });

  it("returns higher BMR for heavier person", () => {
    const bmrLight = calculateBMR("male", 60, 170, 25);
    const bmrHeavy = calculateBMR("male", 90, 170, 25);
    expect(bmrHeavy).toBeGreaterThan(bmrLight);
  });

  it("returns lower BMR for older person", () => {
    const bmrYoung = calculateBMR("male", 70, 175, 20);
    const bmrOld = calculateBMR("male", 70, 175, 50);
    expect(bmrYoung).toBeGreaterThan(bmrOld);
  });
});

describe("Daily Calorie Needs", () => {
  it("calculates daily calorie needs with sedentary factor", () => {
    const bmr = calculateBMR("male", 70, 175, 25);
    const dailyCalories = Math.round(bmr * 1.2);
    expect(dailyCalories).toBe(2069);
  });
});

describe("Protein Coefficient by Monster Type", () => {
  it("returns 1.2 for physique type", () => {
    expect(getProteinCoefficient("physique")).toBe(1.2);
  });

  it("returns 1.6 for bodybuilder type", () => {
    expect(getProteinCoefficient("bodybuilder")).toBe(1.6);
  });

  it("returns 2.0 for powerlifter type", () => {
    expect(getProteinCoefficient("powerlifter")).toBe(2.0);
  });

  it("defaults to 1.2 for unknown type", () => {
    expect(getProteinCoefficient("unknown")).toBe(1.2);
  });

  it("calculates recommended protein correctly", () => {
    const weight = 70;
    const coefficient = getProteinCoefficient("bodybuilder");
    const protein = Math.round(weight * coefficient);
    expect(protein).toBe(112);
  });
});

describe("Input Validation", () => {
  it("validates age range 18-99", () => {
    const validateAge = (age: number) => age >= 18 && age <= 99;
    expect(validateAge(17)).toBe(false);
    expect(validateAge(18)).toBe(true);
    expect(validateAge(50)).toBe(true);
    expect(validateAge(99)).toBe(true);
    expect(validateAge(100)).toBe(false);
  });

  it("validates height range 100-250cm", () => {
    const validateHeight = (h: number) => h >= 100 && h <= 250;
    expect(validateHeight(99)).toBe(false);
    expect(validateHeight(100)).toBe(true);
    expect(validateHeight(175)).toBe(true);
    expect(validateHeight(250)).toBe(true);
    expect(validateHeight(251)).toBe(false);
  });

  it("validates weight range 30-200kg", () => {
    const validateWeight = (w: number) => w >= 30 && w <= 200;
    expect(validateWeight(29)).toBe(false);
    expect(validateWeight(30)).toBe(true);
    expect(validateWeight(70)).toBe(true);
    expect(validateWeight(200)).toBe(true);
    expect(validateWeight(201)).toBe(false);
  });
});

describe("Haversine Distance Calculation", () => {
  function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  it("returns 0 for same location", () => {
    const d = haversineDistance(22.3, 114.2, 22.3, 114.2);
    expect(d).toBe(0);
  });

  it("returns correct distance for nearby locations in Hong Kong", () => {
    // TST to Central is about 2km
    const d = haversineDistance(22.2988, 114.1722, 22.2819, 114.1587);
    expect(d).toBeGreaterThan(1);
    expect(d).toBeLessThan(5);
  });

  it("returns locations within 10km radius", () => {
    const d = haversineDistance(22.3, 114.2, 22.35, 114.25);
    expect(d).toBeLessThan(10);
  });

  it("filters out locations beyond radius", () => {
    // Hong Kong to Taipei is about 800km
    const d = haversineDistance(22.3, 114.2, 25.03, 121.57);
    expect(d).toBeGreaterThan(50);
  });
});
