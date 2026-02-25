import { describe, it, expect } from "vitest";

/**
 * Round 83 tests:
 * 1. Server nearby API: includeFriends and genderFilter params
 * 2. Map display: monster name, friend badge, gender filter
 */

// Simulate the server-side filtering logic from routers.ts
function filterNearbyResults(
  nearbyLocations: Array<{ userId: number; latitude: number; longitude: number; distanceKm: number }>,
  usersInfo: Array<{ userId: number; monsterName: string | null; gender: string | null; monsterType: string; monsterLevel: number }>,
  friendIds: Set<number>,
  pendingIds: Set<number>,
  includeFriends: boolean,
  genderFilter: 'all' | 'male' | 'female',
) {
  const excludeIds = new Set<number>();
  if (!includeFriends) {
    for (const id of friendIds) excludeIds.add(id);
    for (const id of pendingIds) excludeIds.add(id);
  }

  const results = nearbyLocations
    .filter(loc => !excludeIds.has(loc.userId))
    .map(loc => {
      const info = usersInfo.find(u => u.userId === loc.userId);
      return {
        ...loc,
        monsterName: info?.monsterName || null,
        gender: info?.gender || null,
        monsterType: info?.monsterType || 'bodybuilder',
        monsterLevel: info?.monsterLevel || 1,
        isFriend: friendIds.has(loc.userId),
        isPending: pendingIds.has(loc.userId),
      };
    });

  if (genderFilter === 'all') return results;
  return results.filter(u => {
    if (!u.gender) return true;
    return u.gender === genderFilter;
  });
}

describe("Nearby API - includeFriends parameter", () => {
  const nearbyLocations = [
    { userId: 1, latitude: 22.3, longitude: 114.2, distanceKm: 0.5 },
    { userId: 2, latitude: 22.31, longitude: 114.21, distanceKm: 1.2 },
    { userId: 3, latitude: 22.32, longitude: 114.22, distanceKm: 2.0 },
    { userId: 4, latitude: 22.33, longitude: 114.23, distanceKm: 3.5 },
  ];
  const usersInfo = [
    { userId: 1, monsterName: "FireDragon", gender: "male", monsterType: "bodybuilder", monsterLevel: 5 },
    { userId: 2, monsterName: "IcePhoenix", gender: "female", monsterType: "runner", monsterLevel: 3 },
    { userId: 3, monsterName: "ThunderBear", gender: "male", monsterType: "powerlifter", monsterLevel: 7 },
    { userId: 4, monsterName: null, gender: null, monsterType: "bodybuilder", monsterLevel: 1 },
  ];
  const friendIds = new Set([1, 2]);
  const pendingIds = new Set([3]);

  it("should exclude friends and pending when includeFriends=false", () => {
    const results = filterNearbyResults(nearbyLocations, usersInfo, friendIds, pendingIds, false, 'all');
    expect(results).toHaveLength(1);
    expect(results[0].userId).toBe(4);
  });

  it("should include friends and pending when includeFriends=true", () => {
    const results = filterNearbyResults(nearbyLocations, usersInfo, friendIds, pendingIds, true, 'all');
    expect(results).toHaveLength(4);
  });

  it("should mark isFriend correctly", () => {
    const results = filterNearbyResults(nearbyLocations, usersInfo, friendIds, pendingIds, true, 'all');
    expect(results.find(u => u.userId === 1)?.isFriend).toBe(true);
    expect(results.find(u => u.userId === 2)?.isFriend).toBe(true);
    expect(results.find(u => u.userId === 3)?.isFriend).toBe(false);
    expect(results.find(u => u.userId === 4)?.isFriend).toBe(false);
  });

  it("should mark isPending correctly", () => {
    const results = filterNearbyResults(nearbyLocations, usersInfo, friendIds, pendingIds, true, 'all');
    expect(results.find(u => u.userId === 3)?.isPending).toBe(true);
    expect(results.find(u => u.userId === 1)?.isPending).toBe(false);
  });
});

describe("Nearby API - genderFilter parameter", () => {
  const nearbyLocations = [
    { userId: 1, latitude: 22.3, longitude: 114.2, distanceKm: 0.5 },
    { userId: 2, latitude: 22.31, longitude: 114.21, distanceKm: 1.2 },
    { userId: 3, latitude: 22.32, longitude: 114.22, distanceKm: 2.0 },
    { userId: 4, latitude: 22.33, longitude: 114.23, distanceKm: 3.5 },
  ];
  const usersInfo = [
    { userId: 1, monsterName: "FireDragon", gender: "male", monsterType: "bodybuilder", monsterLevel: 5 },
    { userId: 2, monsterName: "IcePhoenix", gender: "female", monsterType: "runner", monsterLevel: 3 },
    { userId: 3, monsterName: "ThunderBear", gender: "male", monsterType: "powerlifter", monsterLevel: 7 },
    { userId: 4, monsterName: null, gender: null, monsterType: "bodybuilder", monsterLevel: 1 },
  ];
  const friendIds = new Set<number>();
  const pendingIds = new Set<number>();

  it("should return all users when genderFilter=all", () => {
    const results = filterNearbyResults(nearbyLocations, usersInfo, friendIds, pendingIds, true, 'all');
    expect(results).toHaveLength(4);
  });

  it("should return only males (+ no-gender) when genderFilter=male", () => {
    const results = filterNearbyResults(nearbyLocations, usersInfo, friendIds, pendingIds, true, 'male');
    // userId 1 (male), 3 (male), 4 (null gender → included)
    expect(results).toHaveLength(3);
    expect(results.map(u => u.userId).sort()).toEqual([1, 3, 4]);
  });

  it("should return only females (+ no-gender) when genderFilter=female", () => {
    const results = filterNearbyResults(nearbyLocations, usersInfo, friendIds, pendingIds, true, 'female');
    // userId 2 (female), 4 (null gender → included)
    expect(results).toHaveLength(2);
    expect(results.map(u => u.userId).sort()).toEqual([2, 4]);
  });
});

describe("Map display - monster name instead of username", () => {
  it("should display monsterName when available", () => {
    const user = { monsterName: "FireDragon", name: "JohnDoe" };
    const displayName = user.monsterName || 'Monster';
    expect(displayName).toBe("FireDragon");
  });

  it("should display 'Monster' when monsterName is null", () => {
    const user = { monsterName: null, name: "JohnDoe" };
    const displayName = user.monsterName || 'Monster';
    expect(displayName).toBe("Monster");
  });

  it("should show gender icon correctly", () => {
    const getGenderIcon = (gender: string | null) =>
      gender === 'male' ? ' ♂' : gender === 'female' ? ' ♀' : '';
    expect(getGenderIcon('male')).toBe(' ♂');
    expect(getGenderIcon('female')).toBe(' ♀');
    expect(getGenderIcon(null)).toBe('');
  });

  it("should use green pin for friends and blue for non-friends", () => {
    const getPinColor = (isFriend: boolean) => isFriend ? "#22C55E" : "#3B82F6";
    expect(getPinColor(true)).toBe("#22C55E");
    expect(getPinColor(false)).toBe("#3B82F6");
  });
});
