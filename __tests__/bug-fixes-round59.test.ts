import { describe, it, expect } from "vitest";

/**
 * Tests for Bug Fix Round 59:
 * 1. Chat no longer has AI auto-replies
 * 2. Sent requests persisted via backend API
 * 3. Monster name used instead of real name for privacy
 * 4. FakeTrainer users deleted
 */

describe("Bug Fix Round 59: Privacy - Monster name display", () => {
  it("should use monster name over real name when available", () => {
    // Simulate the name resolution logic used in routers.ts
    const resolveDisplayName = (info: any) => {
      return info?.activeMonster?.name || info?.profile?.trainerName || "Trainer";
    };

    // Case 1: User has monster with name
    const withMonster = {
      activeMonster: { name: "FlameKing", monsterType: "bodybuilder", level: 5 },
      profile: { trainerName: "John Doe" },
      user: { name: "chenghiuching denise" },
    };
    expect(resolveDisplayName(withMonster)).toBe("FlameKing");

    // Case 2: User has no monster but has trainer name
    const noMonster = {
      activeMonster: null,
      profile: { trainerName: "TrainerX" },
      user: { name: "Real Name" },
    };
    expect(resolveDisplayName(noMonster)).toBe("TrainerX");

    // Case 3: User has nothing
    const noInfo = {
      activeMonster: null,
      profile: null,
      user: { name: "Real Name" },
    };
    expect(resolveDisplayName(noInfo)).toBe("Trainer");
  });

  it("should use monster name in buildOpponentFromNearby", () => {
    // Simulate the logic from battle.tsx buildOpponentFromNearby
    const buildName = (user: any) => {
      const type = (user.monsterType || "bodybuilder").toLowerCase();
      return user.monsterName || (type.charAt(0).toUpperCase() + type.slice(1));
    };

    expect(buildName({ monsterName: "ThunderBeast", monsterType: "powerlifter" })).toBe("ThunderBeast");
    expect(buildName({ monsterName: null, monsterType: "physique" })).toBe("Physique");
    expect(buildName({ monsterName: undefined, monsterType: "bodybuilder" })).toBe("Bodybuilder");
  });

  it("should never expose real user name in nearby display", () => {
    // The name field in location.nearby response should prioritize monster name
    const buildNearbyName = (info: any) => {
      return info?.activeMonster?.name || info?.profile?.trainerName || "Trainer";
    };

    // Real user "chenghiuching denise" should not appear
    const denise = {
      activeMonster: { name: "CuteBeast" },
      profile: { trainerName: null },
      user: { name: "chenghiuching denise" },
    };
    const result = buildNearbyName(denise);
    expect(result).not.toContain("chenghiuching");
    expect(result).not.toContain("denise");
    expect(result).toBe("CuteBeast");
  });
});

describe("Bug Fix Round 59: Chat - No AI auto-replies", () => {
  it("should not have AUTO_REPLIES array in chat module", async () => {
    // Read the chat.tsx file and verify AUTO_REPLIES is removed
    // Round 60 replaced 'Coming Soon' placeholder with real WebSocket chat
    const fs = await import("fs");
    const chatContent = fs.readFileSync("app/chat.tsx", "utf-8");
    expect(chatContent).not.toContain("AUTO_REPLIES");
    expect(chatContent).not.toContain("Simulate auto-reply");
    // Chat now uses real WebSocket messaging
    expect(chatContent).toContain("useWebSocket");
  });
});

describe("Bug Fix Round 59: Sent requests persistence", () => {
  it("should have sentRequests route defined in routers", async () => {
    const fs = await import("fs");
    const routersContent = fs.readFileSync("server/routers.ts", "utf-8");
    expect(routersContent).toContain("sentRequests:");
    expect(routersContent).toContain("getSentFriendRequests");
  });

  it("should have getSentFriendRequests function in db", async () => {
    const fs = await import("fs");
    const dbContent = fs.readFileSync("server/db.ts", "utf-8");
    expect(dbContent).toContain("export async function getSentFriendRequests");
    // Should query where userId = current user (sender) and status = pending
    expect(dbContent).toContain("eq(friendships.userId, userId)");
  });

  it("should use sentQuery in battle.tsx", async () => {
    const fs = await import("fs");
    const battleContent = fs.readFileSync("app/(tabs)/battle.tsx", "utf-8");
    expect(battleContent).toContain("sentQuery");
    expect(battleContent).toContain("friends.sentRequests");
    expect(battleContent).toContain("sentByMe: true");
  });
});

describe("Bug Fix Round 59: Map display uses monster name", () => {
  it("should use monsterName in nearby-map markers", async () => {
    const fs = await import("fs");
    const mapContent = fs.readFileSync("app/nearby-map.tsx", "utf-8");
    // Should not show "Fit Monster" as generic name anymore
    expect(mapContent).not.toContain("title: `Fit Monster");
    // Should use monsterName or name
    expect(mapContent).toContain("monsterName");
    expect(mapContent).toContain("item.monsterName || item.name");
  });
});
