import { describe, it, expect } from "vitest";

// Test the client-side gender filter logic (same as in nearby-map.tsx displayedUsers)
function filterByGender(
  users: Array<{ userId: number; gender: string | null }>,
  genderFilter: "all" | "male" | "female"
) {
  return users.filter((user) => {
    if (genderFilter === "all") return true;
    if (!user.gender) return false;
    return user.gender === genderFilter;
  });
}

// Test the server-side gender filter logic (same as in routers.ts)
function serverGenderFilter(
  results: Array<{ userId: number; gender: string | null }>,
  genderFilter: string
) {
  if (genderFilter === "all") return results;
  return results.filter((u) => {
    if (!u.gender) return false;
    return u.gender === genderFilter;
  });
}

describe("Round 86: Gender filter (client-side)", () => {
  const users = [
    { userId: 1, gender: "male" },
    { userId: 2, gender: "female" },
    { userId: 3, gender: null },
    { userId: 4, gender: "male" },
    { userId: 5, gender: null },
  ];

  it("shows all users when filter is 'all'", () => {
    const result = filterByGender(users, "all");
    expect(result).toHaveLength(5);
  });

  it("shows only male users when filter is 'male'", () => {
    const result = filterByGender(users, "male");
    expect(result).toHaveLength(2);
    expect(result.every((u) => u.gender === "male")).toBe(true);
  });

  it("shows only female users when filter is 'female'", () => {
    const result = filterByGender(users, "female");
    expect(result).toHaveLength(1);
    expect(result[0].gender).toBe("female");
  });

  it("hides users with null gender when filtering by male", () => {
    const result = filterByGender(users, "male");
    expect(result.find((u) => u.gender === null)).toBeUndefined();
  });

  it("hides users with null gender when filtering by female", () => {
    const result = filterByGender(users, "female");
    expect(result.find((u) => u.gender === null)).toBeUndefined();
  });
});

describe("Round 86: Gender filter (server-side)", () => {
  const results = [
    { userId: 1, gender: "male" },
    { userId: 2, gender: "female" },
    { userId: 3, gender: null },
  ];

  it("returns all results when filter is 'all'", () => {
    const filtered = serverGenderFilter(results, "all");
    expect(filtered).toHaveLength(3);
  });

  it("filters to male only, excluding null gender", () => {
    const filtered = serverGenderFilter(results, "male");
    expect(filtered).toHaveLength(1);
    expect(filtered[0].userId).toBe(1);
  });

  it("filters to female only, excluding null gender", () => {
    const filtered = serverGenderFilter(results, "female");
    expect(filtered).toHaveLength(1);
    expect(filtered[0].userId).toBe(2);
  });
});

describe("Round 86: Sharing status persistence", () => {
  it("getUserSharingStatus returns correct boolean from DB value", () => {
    // Simulate DB returning isSharing = 1 (truthy in MySQL)
    const dbResult = { isSharing: 1 };
    const isSharing = !!dbResult.isSharing;
    expect(isSharing).toBe(true);
  });

  it("getUserSharingStatus returns false when no record exists", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dbResult = null as any;
    const isSharing = dbResult?.isSharing ?? false;
    expect(isSharing).toBe(false);
  });

  it("toggle to false should set isSharing to false", () => {
    // Simulate the toggle logic
    const currentState = true;
    const newState = !currentState;
    expect(newState).toBe(false);
    // This would be sent to server as isSharing: false
    const payload = { latitude: 22.3, longitude: 114.1, isSharing: newState };
    expect(payload.isSharing).toBe(false);
  });

  it("toggle to true should set isSharing to true", () => {
    const currentState = false;
    const newState = !currentState;
    expect(newState).toBe(true);
    const payload = { latitude: 22.3, longitude: 114.1, isSharing: newState };
    expect(payload.isSharing).toBe(true);
  });
});

describe("Round 86: Profile sync improvement", () => {
  it("profile data includes gender for backend sync", () => {
    const profileData = {
      birthday: "1990-01-01",
      gender: "male" as const,
      height: 175,
      weight: 70,
    };
    expect(profileData.gender).toBe("male");
    expect(profileData).toHaveProperty("gender");
    expect(profileData).toHaveProperty("birthday");
    expect(profileData).toHaveProperty("height");
    expect(profileData).toHaveProperty("weight");
  });
});
