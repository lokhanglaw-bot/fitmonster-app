import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const projectRoot = path.resolve(__dirname, "..");
const usePushContent = fs.readFileSync(path.join(projectRoot, "hooks/use-push-notifications.ts"), "utf-8");
const routersContent = fs.readFileSync(path.join(projectRoot, "server/routers.ts"), "utf-8");

describe("Round 79: Notification Dedup + Matching Friend Exclusion", () => {
  // === 1. Notification tap dedup ===
  describe("Notification tap dedup - multi-layer protection", () => {
    it("should have module-level _isNavigating flag", () => {
      expect(usePushContent).toContain("let _isNavigating = false");
    });

    it("should have module-level _lastNavigatedChatId", () => {
      expect(usePushContent).toContain("let _lastNavigatedChatId");
    });

    it("should have module-level _lastNavigatedTime", () => {
      expect(usePushContent).toContain("let _lastNavigatedTime = 0");
    });

    it("should have _handledIdentifiers Set for notification dedup", () => {
      expect(usePushContent).toContain("const _handledIdentifiers = new Set");
    });

    it("should have SAME_CHAT_COOLDOWN_MS of at least 5 seconds", () => {
      expect(usePushContent).toContain("SAME_CHAT_COOLDOWN_MS = 5000");
    });

    it("should have GLOBAL_COOLDOWN_MS of at least 3 seconds", () => {
      expect(usePushContent).toContain("GLOBAL_COOLDOWN_MS = 3000");
    });

    it("should have canNavigate function with multi-layer checks", () => {
      expect(usePushContent).toContain("function canNavigate(chatId: string): boolean");
      // Should check _isNavigating
      expect(usePushContent).toContain("if (_isNavigating)");
      // Should check same chat cooldown
      expect(usePushContent).toContain("_lastNavigatedChatId === chatId");
      // Should check global time cooldown
      expect(usePushContent).toContain("_lastNavigatedTime < GLOBAL_COOLDOWN_MS");
    });

    it("should have markNavigated function", () => {
      expect(usePushContent).toContain("function markNavigated(chatId: string)");
    });

    it("should check notification identifier before handling", () => {
      expect(usePushContent).toContain("_handledIdentifiers.has(identifier)");
    });

    it("should dismiss all notifications after handling a tap", () => {
      expect(usePushContent).toContain("dismissAllNotificationsAsync");
    });

    it("should use router.replace for cold start navigation", () => {
      expect(usePushContent).toContain("router.replace(");
    });

    it("should use router.push for warm start navigation", () => {
      expect(usePushContent).toContain("router.push(");
    });

    it("should only handle cold start once via coldStartHandled ref", () => {
      expect(usePushContent).toContain("coldStartHandled.current = true");
    });

    it("should clean up listeners before re-registering", () => {
      const effectSection = usePushContent.substring(
        usePushContent.indexOf("useEffect(() => {"),
        usePushContent.lastIndexOf("return () => {")
      );
      expect(effectSection).toContain("notificationListener.current.remove()");
      expect(effectSection).toContain("responseListener.current.remove()");
    });
  });

  // === 2. Matching excludes friends ===
  describe("Matching API excludes existing friends", () => {
    it("should fetch existing friends in the nearby endpoint", () => {
      const nearbySection = routersContent.substring(
        routersContent.indexOf("nearby: protectedProcedure"),
        routersContent.indexOf("nearby: protectedProcedure") + 2000
      );
      expect(nearbySection).toContain("getUserFriends");
    });

    it("should fetch sent friend requests", () => {
      const nearbySection = routersContent.substring(
        routersContent.indexOf("nearby: protectedProcedure"),
        routersContent.indexOf("nearby: protectedProcedure") + 2000
      );
      expect(nearbySection).toContain("getSentFriendRequests");
    });

    it("should fetch pending friend requests", () => {
      const nearbySection = routersContent.substring(
        routersContent.indexOf("nearby: protectedProcedure"),
        routersContent.indexOf("nearby: protectedProcedure") + 2000
      );
      expect(nearbySection).toContain("getPendingFriendRequests");
    });

    it("should build an excludeIds set", () => {
      const nearbySection = routersContent.substring(
        routersContent.indexOf("nearby: protectedProcedure"),
        routersContent.indexOf("nearby: protectedProcedure") + 2000
      );
      expect(nearbySection).toContain("const excludeIds = new Set<number>()");
    });

    it("should filter out excluded users from results", () => {
      const nearbySection = routersContent.substring(
        routersContent.indexOf("nearby: protectedProcedure"),
        routersContent.indexOf("nearby: protectedProcedure") + 2000
      );
      expect(nearbySection).toContain("excludeIds.has(loc.userId)");
    });

    it("should log the number of excluded users", () => {
      const nearbySection = routersContent.substring(
        routersContent.indexOf("nearby: protectedProcedure"),
        routersContent.indexOf("nearby: protectedProcedure") + 2000
      );
      expect(nearbySection).toContain("Excluding");
      expect(nearbySection).toContain("friends + pending requests");
    });
  });
});
