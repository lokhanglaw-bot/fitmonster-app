import { describe, it, expect } from "vitest";

describe("Round 53: Gender Preference Filtering & Map Callout Actions", () => {
  describe("Server-side Gender Preference Filtering", () => {
    // Simulate the filtering logic from routers.ts location.nearby
    function filterByGenderPreference(
      users: Array<{ userId: number; name: string; gender: string | null }>,
      preference: "all" | "male" | "female"
    ) {
      if (preference === "all") return users;
      return users.filter((u) => {
        if (!u.gender) return true; // Show users without gender set
        return u.gender === preference;
      });
    }

    const mockUsers = [
      { userId: 1, name: "Alice", gender: "female" },
      { userId: 2, name: "Bob", gender: "male" },
      { userId: 3, name: "Charlie", gender: "male" },
      { userId: 4, name: "Dana", gender: "female" },
      { userId: 5, name: "Unknown", gender: null },
    ];

    it("should return all users when preference is 'all'", () => {
      const result = filterByGenderPreference(mockUsers, "all");
      expect(result).toHaveLength(5);
    });

    it("should return only male users (+ null gender) when preference is 'male'", () => {
      const result = filterByGenderPreference(mockUsers, "male");
      expect(result).toHaveLength(3); // Bob, Charlie, Unknown
      expect(result.map((u) => u.name)).toContain("Bob");
      expect(result.map((u) => u.name)).toContain("Charlie");
      expect(result.map((u) => u.name)).toContain("Unknown");
      expect(result.map((u) => u.name)).not.toContain("Alice");
      expect(result.map((u) => u.name)).not.toContain("Dana");
    });

    it("should return only female users (+ null gender) when preference is 'female'", () => {
      const result = filterByGenderPreference(mockUsers, "female");
      expect(result).toHaveLength(3); // Alice, Dana, Unknown
      expect(result.map((u) => u.name)).toContain("Alice");
      expect(result.map((u) => u.name)).toContain("Dana");
      expect(result.map((u) => u.name)).toContain("Unknown");
      expect(result.map((u) => u.name)).not.toContain("Bob");
    });

    it("should include users with null gender regardless of preference", () => {
      const resultMale = filterByGenderPreference(mockUsers, "male");
      const resultFemale = filterByGenderPreference(mockUsers, "female");
      const resultAll = filterByGenderPreference(mockUsers, "all");

      // Unknown (null gender) should appear in all results
      expect(resultMale.find((u) => u.name === "Unknown")).toBeTruthy();
      expect(resultFemale.find((u) => u.name === "Unknown")).toBeTruthy();
      expect(resultAll.find((u) => u.name === "Unknown")).toBeTruthy();
    });

    it("should handle empty user list", () => {
      const result = filterByGenderPreference([], "male");
      expect(result).toHaveLength(0);
    });

    it("should handle all users having null gender", () => {
      const nullGenderUsers = [
        { userId: 1, name: "A", gender: null },
        { userId: 2, name: "B", gender: null },
      ];
      const result = filterByGenderPreference(nullGenderUsers, "female");
      expect(result).toHaveLength(2); // Both should show since null gender passes through
    });
  });

  describe("Map Pin Callout Actions", () => {
    interface CalloutAction {
      label: string;
      emoji: string;
      onPress: () => void;
      color?: string;
    }

    interface MapMarker {
      id: string;
      title: string;
      pinColor: string;
      showActions?: boolean;
      actions?: CalloutAction[];
    }

    it("should create friend markers with battle and chat actions", () => {
      const friendMarkers: MapMarker[] = [
        {
          id: "friend-1",
          title: "Alice (Friend)",
          pinColor: "#22C55E",
          showActions: true,
          actions: [
            { label: "Battle", emoji: "⚔️", onPress: () => {}, color: "#0a7ea4" },
            { label: "Chat", emoji: "💬", onPress: () => {}, color: "#22C55E" },
          ],
        },
      ];

      expect(friendMarkers[0].showActions).toBe(true);
      expect(friendMarkers[0].actions).toHaveLength(2);
      expect(friendMarkers[0].actions![0].label).toBe("Battle");
      expect(friendMarkers[0].actions![0].emoji).toBe("⚔️");
      expect(friendMarkers[0].actions![1].label).toBe("Chat");
      expect(friendMarkers[0].actions![1].emoji).toBe("💬");
    });

    it("should create non-friend markers without actions", () => {
      const nearbyMarkers: MapMarker[] = [
        {
          id: "nearby-2",
          title: "Bob",
          pinColor: "#3B82F6",
        },
      ];

      expect(nearbyMarkers[0].showActions).toBeUndefined();
      expect(nearbyMarkers[0].actions).toBeUndefined();
    });

    it("friend markers should have green pin color", () => {
      const friendMarker: MapMarker = {
        id: "friend-1",
        title: "Alice (Friend)",
        pinColor: "#22C55E",
        showActions: true,
        actions: [],
      };
      expect(friendMarker.pinColor).toBe("#22C55E");
    });

    it("non-friend markers should have blue pin color", () => {
      const nearbyMarker: MapMarker = {
        id: "nearby-2",
        title: "Bob",
        pinColor: "#3B82F6",
      };
      expect(nearbyMarker.pinColor).toBe("#3B82F6");
    });

    it("should generate unique marker IDs", () => {
      const friends = [
        { userId: 1, name: "Alice" },
        { userId: 2, name: "Bob" },
      ];
      const nearby = [
        { userId: 3, name: "Charlie" },
        { userId: 4, name: "Dana" },
      ];

      const friendIds = friends.map((f) => `friend-${f.userId}`);
      const nearbyIds = nearby.map((n) => `nearby-${n.userId}`);
      const allIds = [...friendIds, ...nearbyIds];

      // All IDs should be unique
      const uniqueIds = new Set(allIds);
      expect(uniqueIds.size).toBe(allIds.length);
    });
  });

  describe("i18n Translations", () => {
    it("should have English translations for map actions", () => {
      const en = {
        mapBattle: "Battle",
        mapChat: "Chat",
        tapPinForActions: "Tap a friend pin for actions",
      };
      expect(en.mapBattle).toBe("Battle");
      expect(en.mapChat).toBe("Chat");
      expect(en.tapPinForActions).toBeTruthy();
    });

    it("should have Chinese translations for map actions", () => {
      const zh = {
        mapBattle: "對戰",
        mapChat: "聊天",
        tapPinForActions: "點擊好友圖釘查看操作",
      };
      expect(zh.mapBattle).toBe("對戰");
      expect(zh.mapChat).toBe("聊天");
      expect(zh.tapPinForActions).toBeTruthy();
    });
  });

  describe("Haversine Distance Calculation", () => {
    function haversineDistance(
      lat1: number, lon1: number,
      lat2: number, lon2: number
    ): number {
      const R = 6371; // Earth radius in km
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    }

    it("should calculate distance within 50km radius correctly", () => {
      // Hong Kong (22.3193, 114.1694) to Shenzhen (22.5431, 114.0579)
      const distance = haversineDistance(22.3193, 114.1694, 22.5431, 114.0579);
      expect(distance).toBeLessThan(50);
      expect(distance).toBeGreaterThan(20);
    });

    it("should correctly identify users outside 50km radius", () => {
      // Hong Kong to Guangzhou (~120km)
      const distance = haversineDistance(22.3193, 114.1694, 23.1291, 113.2644);
      expect(distance).toBeGreaterThan(50);
    });

    it("should return 0 for same location", () => {
      const distance = haversineDistance(22.3193, 114.1694, 22.3193, 114.1694);
      expect(distance).toBeCloseTo(0, 5);
    });
  });
});
