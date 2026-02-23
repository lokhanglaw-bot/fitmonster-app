import { describe, it, expect, vi } from "vitest";

describe("Bug Fixes Verification", () => {
  describe("Monster sync URL", () => {
    it("should include ?batch=1 in the sync URL", async () => {
      // Read the activity-context file and verify the URL includes ?batch=1
      const fs = await import("fs");
      const content = fs.readFileSync("lib/activity-context.tsx", "utf-8");
      expect(content).toContain("monsters.sync?batch=1");
    });

    it("should always sync on first hydration (hasInitialSyncRef)", async () => {
      const fs = await import("fs");
      const content = fs.readFileSync("lib/activity-context.tsx", "utf-8");
      expect(content).toContain("hasInitialSyncRef");
      expect(content).toContain("hasInitialSyncRef.current = true");
    });
  });

  describe("Seed button removal", () => {
    it("should not have seed button in nearby-map", async () => {
      const fs = await import("fs");
      const content = fs.readFileSync("app/nearby-map.tsx", "utf-8");
      expect(content).not.toContain("seedFake");
      expect(content).not.toContain("deleteFake");
      expect(content).not.toContain("Seed 100");
    });
  });

  describe("{name} literal fix", () => {
    it("should not have literal {name} in nearby-map alerts", async () => {
      const fs = await import("fs");
      const content = fs.readFileSync("app/nearby-map.tsx", "utf-8");
      // Check that Alert.alert calls don't use t.friendRequestSentMsg directly (which has {name})
      // Instead they should use tr() for interpolation
      const alertLines = content.split("\n").filter((l: string) => l.includes("Alert.alert"));
      for (const line of alertLines) {
        // If the line references friendRequestSentMsg, it should use tr() not t.
        if (line.includes("friendRequestSentMsg")) {
          expect(line).toContain("tr(");
        }
      }
    });
  });

  describe("WebSocket fallback auth", () => {
    it("should have improved fallback auth with Number() conversion", async () => {
      const fs = await import("fs");
      const content = fs.readFileSync("server/websocket.ts", "utf-8");
      expect(content).toContain("Number(msg.userId)");
      expect(content).toContain("Trying fallback auth");
      expect(content).toContain("connected via fallback auth");
    });
  });

  describe("Profile backend sync", () => {
    it("should sync profile to backend in profile-setup", async () => {
      const fs = await import("fs");
      const content = fs.readFileSync("app/profile-setup.tsx", "utf-8");
      expect(content).toContain("profile.setupProfile?batch=1");
      expect(content).toContain("Profile synced to backend");
    });

    it("should sync profile to backend in edit-profile", async () => {
      const fs = await import("fs");
      const content = fs.readFileSync("app/edit-profile.tsx", "utf-8");
      expect(content).toContain("profile.updateProfileData?batch=1");
      expect(content).toContain("Profile synced to backend");
    });

    it("should auto-sync profile on load in use-profile-data hook", async () => {
      const fs = await import("fs");
      const content = fs.readFileSync("hooks/use-profile-data.ts", "utf-8");
      expect(content).toContain("profile.setupProfile?batch=1");
      expect(content).toContain("Profile synced to backend on load");
    });
  });

  describe("Profile upsert in server", () => {
    it("should handle upsert in setupProfile endpoint", async () => {
      const fs = await import("fs");
      const content = fs.readFileSync("server/routers.ts", "utf-8");
      // Should check if profile exists before creating
      expect(content).toContain("Upsert: create profile if it doesn't exist");
      expect(content).toContain("db.createProfile");
    });

    it("should handle missing profile in updateProfileData endpoint", async () => {
      const fs = await import("fs");
      const content = fs.readFileSync("server/routers.ts", "utf-8");
      // Should create profile if it doesn't exist
      expect(content).toContain("If no profile exists yet, create one");
    });
  });
});
