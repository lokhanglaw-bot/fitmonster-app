import { describe, it, expect } from "vitest";

// Test the getTimeAgo logic
function getTimeAgo(lastUpdated: Date | string): { text: string; isOnline: boolean } {
  const now = Date.now();
  const updated = new Date(lastUpdated).getTime();
  const diffMs = now - updated;
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 5) return { text: "Now", isOnline: true };
  if (diffMin < 60) return { text: `${diffMin}m ago`, isOnline: false };
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return { text: `${diffHours}h ago`, isOnline: false };
  return { text: `${Math.floor(diffHours / 24)}d ago`, isOnline: false };
}

// Test BMR calculation (Harris-Benedict)
function calculateBMR(gender: string, weight: number, height: number, age: number): number {
  if (gender === "male") {
    return Math.round(88.362 + 13.397 * weight + 4.799 * height - 5.677 * age);
  }
  return Math.round(447.593 + 9.247 * weight + 3.098 * height - 4.330 * age);
}

// Test protein coefficient by monster type
function getProteinCoefficient(monsterType: string): number {
  switch (monsterType) {
    case "physique": return 1.2;
    case "bodybuilder": return 1.6;
    case "powerlifter": return 2.0;
    default: return 1.2;
  }
}

// Test age calculation from birthday
function calculateAge(birthday: string): number {
  const today = new Date();
  const birth = new Date(birthday);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

describe("Nearby Map - getTimeAgo", () => {
  it("should return 'Now' for recent timestamps", () => {
    const result = getTimeAgo(new Date());
    expect(result.text).toBe("Now");
    expect(result.isOnline).toBe(true);
  });

  it("should return minutes ago for timestamps within an hour", () => {
    const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000);
    const result = getTimeAgo(thirtyMinAgo);
    expect(result.text).toBe("30m ago");
    expect(result.isOnline).toBe(false);
  });

  it("should return hours ago for timestamps within a day", () => {
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);
    const result = getTimeAgo(threeHoursAgo);
    expect(result.text).toBe("3h ago");
    expect(result.isOnline).toBe(false);
  });

  it("should return days ago for old timestamps", () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    const result = getTimeAgo(twoDaysAgo);
    expect(result.text).toBe("2d ago");
    expect(result.isOnline).toBe(false);
  });
});

describe("BMR Calculation", () => {
  it("should calculate male BMR correctly", () => {
    // Male, 69.5kg, 168cm, 39 years
    const bmr = calculateBMR("male", 69.5, 168, 39);
    // 88.362 + 13.397*69.5 + 4.799*168 - 5.677*39
    // = 88.362 + 931.092 + 806.232 - 221.403 = 1604.283
    expect(bmr).toBe(1604);
  });

  it("should calculate female BMR correctly", () => {
    // Female, 55kg, 160cm, 30 years
    const bmr = calculateBMR("female", 55, 160, 30);
    // 447.593 + 9.247*55 + 3.098*160 - 4.330*30
    // = 447.593 + 508.585 + 495.68 - 129.9 = 1321.958
    expect(bmr).toBe(1322);
  });
});

describe("Protein Coefficient", () => {
  it("should return 1.2 for physique", () => {
    expect(getProteinCoefficient("physique")).toBe(1.2);
  });

  it("should return 1.6 for bodybuilder", () => {
    expect(getProteinCoefficient("bodybuilder")).toBe(1.6);
  });

  it("should return 2.0 for powerlifter", () => {
    expect(getProteinCoefficient("powerlifter")).toBe(2.0);
  });

  it("should default to 1.2 for unknown type", () => {
    expect(getProteinCoefficient("unknown")).toBe(1.2);
  });
});

describe("Age Calculation from Birthday", () => {
  it("should calculate age correctly for past birthday this year", () => {
    const age = calculateAge("1986-01-01");
    expect(age).toBe(40); // Born Jan 1 1986, now Feb 22 2026
  });

  it("should calculate age correctly for future birthday this year", () => {
    const age = calculateAge("1986-12-11");
    expect(age).toBe(39); // Born Dec 11 1986, now Feb 22 2026 (birthday hasn't passed)
  });

  it("should handle same day birthday", () => {
    const age = calculateAge("1990-02-22");
    expect(age).toBe(36); // Born Feb 22 1990, now Feb 22 2026
  });
});
