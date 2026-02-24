import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

describe("Round 75: Push Notification Enhancements", () => {
  const projectRoot = path.join(__dirname, "..");

  // === 1. Notification Tap Navigation ===
  describe("Notification tap navigation to chat", () => {
    const hookPath = path.join(projectRoot, "hooks/use-push-notifications.ts");
    const hookContent = fs.readFileSync(hookPath, "utf-8");

    it("should import useRouter from expo-router", () => {
      expect(hookContent).toContain('import { useRouter } from "expo-router"');
    });

    it("should have addNotificationResponseReceivedListener for tap handling", () => {
      expect(hookContent).toContain("addNotificationResponseReceivedListener");
    });

    it("should check for chat_message type in notification data", () => {
      expect(hookContent).toContain('data?.type === "chat_message"');
    });

    it("should navigate to /chat with friendId and friendName params", () => {
      expect(hookContent).toContain('pathname: "/chat"');
      expect(hookContent).toContain("friendId: senderId");
      expect(hookContent).toContain("friendName: senderName");
    });

    it("should handle cold start notification via getLastNotificationResponseAsync", () => {
      expect(hookContent).toContain("getLastNotificationResponseAsync");
    });

    it("should use delayed navigation for cold start (1500ms)", () => {
      expect(hookContent).toContain("1500");
    });

    it("should configure notification handler to show alerts and badges", () => {
      expect(hookContent).toContain("shouldShowAlert: true");
      expect(hookContent).toContain("shouldSetBadge: true");
    });
  });

  // === 2. App Badge Count Updates ===
  describe("App badge count management", () => {
    const providerPath = path.join(projectRoot, "lib/notification-provider.tsx");
    const providerContent = fs.readFileSync(providerPath, "utf-8");

    it("should import Notifications for badge management", () => {
      expect(providerContent).toContain('import * as Notifications from "expo-notifications"');
    });

    it("should import AppState for foreground detection", () => {
      expect(providerContent).toContain("AppState");
    });

    it("should query unread count from server", () => {
      expect(providerContent).toContain("trpc.chat.unreadCount.useQuery");
    });

    it("should call setBadgeCountAsync to update badge", () => {
      expect(providerContent).toContain("Notifications.setBadgeCountAsync");
    });

    it("should expose updateBadgeCount in context", () => {
      expect(providerContent).toContain("updateBadgeCount");
    });

    it("should listen for AppState changes to refresh badge on foreground", () => {
      expect(providerContent).toContain('AppState.addEventListener("change"');
      expect(providerContent).toContain('"active"');
    });

    it("should refetch unread count when new_message event arrives", () => {
      expect(providerContent).toContain("unreadQuery.refetch()");
    });
  });

  // === 3. REST markRead Endpoint ===
  describe("REST markRead endpoint", () => {
    const routersPath = path.join(projectRoot, "server/routers.ts");
    const routersContent = fs.readFileSync(routersPath, "utf-8");

    it("should have markRead mutation in chat router", () => {
      expect(routersContent).toContain("markRead: protectedProcedure");
    });

    it("should accept senderId as input", () => {
      // Check that markRead has senderId input
      const markReadSection = routersContent.substring(
        routersContent.indexOf("markRead: protectedProcedure"),
        routersContent.indexOf("markRead: protectedProcedure") + 300
      );
      expect(markReadSection).toContain("senderId: z.number()");
    });

    it("should call markMessagesAsRead from chatDb", () => {
      expect(routersContent).toContain("chatDb.markMessagesAsRead(input.senderId, ctx.user.id)");
    });

    it("should notify sender via WebSocket about read receipt", () => {
      const markReadSection = routersContent.substring(
        routersContent.indexOf("markRead: protectedProcedure"),
        routersContent.indexOf("markRead: protectedProcedure") + 400
      );
      expect(markReadSection).toContain("sendToUser(input.senderId");
      expect(markReadSection).toContain("messages_read");
    });
  });

  // === 4. Chat Screen REST markRead ===
  describe("Chat screen REST markRead integration", () => {
    const chatPath = path.join(projectRoot, "app/chat.tsx");
    const chatContent = fs.readFileSync(chatPath, "utf-8");

    it("should have markRead mutation hook", () => {
      expect(chatContent).toContain("trpc.chat.markRead.useMutation()");
    });

    it("should call markRead when history loads", () => {
      expect(chatContent).toContain("markReadMutation.mutate({ senderId: friendIdNum })");
    });
  });

  // === 5. Server Push Notification Data ===
  describe("Server push notification payload", () => {
    const pushPath = path.join(projectRoot, "server/push-notifications.ts");
    const pushContent = fs.readFileSync(pushPath, "utf-8");

    it("should include senderId in chat push notification data", () => {
      expect(pushContent).toContain("senderId");
    });

    it("should include senderName in chat push notification data", () => {
      expect(pushContent).toContain("senderName");
    });

    it("should include type: chat_message in data", () => {
      expect(pushContent).toContain('"chat_message"');
    });
  });

  // === 6. Background Notification Task ===
  describe("Background notification task", () => {
    const bgPath = path.join(projectRoot, "lib/background-notifications.ts");
    const bgContent = fs.readFileSync(bgPath, "utf-8");

    it("should define background notification task with TaskManager", () => {
      expect(bgContent).toContain("TaskManager.defineTask");
      expect(bgContent).toContain("BACKGROUND_NOTIFICATION");
    });

    it("should export registerBackgroundNotificationTask function", () => {
      expect(bgContent).toContain("export async function registerBackgroundNotificationTask");
    });

    it("should check if task is already registered before registering", () => {
      expect(bgContent).toContain("TaskManager.isTaskRegisteredAsync");
    });

    it("should call Notifications.registerTaskAsync", () => {
      expect(bgContent).toContain("Notifications.registerTaskAsync");
    });

    it("should update badge count in background task", () => {
      expect(bgContent).toContain("Notifications.setBadgeCountAsync");
    });
  });

  // === 7. App Config ===
  describe("App config for background notifications", () => {
    const configPath = path.join(projectRoot, "app.config.ts");
    const configContent = fs.readFileSync(configPath, "utf-8");

    it("should have expo-notifications plugin configured", () => {
      expect(configContent).toContain('"expo-notifications"');
    });

    it("should enable background remote notifications", () => {
      expect(configContent).toContain("enableBackgroundRemoteNotifications: true");
    });
  });

  // === 8. Root Layout Registration ===
  describe("Root layout background task registration", () => {
    const layoutPath = path.join(projectRoot, "app/_layout.tsx");
    const layoutContent = fs.readFileSync(layoutPath, "utf-8");

    it("should import registerBackgroundNotificationTask", () => {
      expect(layoutContent).toContain("registerBackgroundNotificationTask");
    });

    it("should call registerBackgroundNotificationTask in useEffect", () => {
      expect(layoutContent).toContain("registerBackgroundNotificationTask()");
    });

    it("should only register on non-web platforms", () => {
      // Check that the registration is guarded by Platform.OS !== "web"
      const idx = layoutContent.indexOf("registerBackgroundNotificationTask()");
      const contextBefore = layoutContent.substring(Math.max(0, idx - 100), idx);
      expect(contextBefore).toContain('Platform.OS !== "web"');
    });
  });
});
