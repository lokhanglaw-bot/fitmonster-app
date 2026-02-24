import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const projectRoot = path.resolve(__dirname, "..");

describe("Round 76: REST-only Chat (WebSocket Removed)", () => {
  // === 1. chat.tsx should NOT import or use WebSocket ===
  describe("chat.tsx is WebSocket-free", () => {
    const chatContent = fs.readFileSync(path.join(projectRoot, "app/chat.tsx"), "utf-8");

    it("should NOT import useWebSocket", () => {
      expect(chatContent).not.toContain("useWebSocket");
      expect(chatContent).not.toContain("use-websocket");
    });

    it("should NOT have WS status/send/on/connect references", () => {
      expect(chatContent).not.toContain("wsReconnect");
      expect(chatContent).not.toContain("wsFailCountRef");
    });

    it("should NOT have restMode state (always REST now)", () => {
      expect(chatContent).not.toContain("setRestMode");
      expect(chatContent).not.toContain("restMode");
    });

    it("should NOT have Debug Log panel", () => {
      expect(chatContent).not.toContain("showDebugLog");
      expect(chatContent).not.toContain("debugLogs");
      expect(chatContent).not.toContain("debugPanel");
      expect(chatContent).not.toContain("debugToggle");
    });

    it("should NOT have console.log/error interceptors", () => {
      expect(chatContent).not.toContain("origLog");
      expect(chatContent).not.toContain("origError");
    });

    it("should use REST sendMessageMutation for sending text", () => {
      expect(chatContent).toContain("sendMessageMutation.mutateAsync");
    });

    it("should use REST sendMessageMutation for sending images", () => {
      // Image upload should go through REST
      const imageSection = chatContent.substring(
        chatContent.indexOf("uploadAndSendImage"),
        chatContent.indexOf("uploadAndSendImage") + 800
      );
      expect(imageSection).toContain("sendMessageMutation.mutateAsync");
    });

    it("should use REST sendMessageMutation for sending audio", () => {
      const startIdx = chatContent.indexOf("const stopRecording");
      const audioSection = chatContent.substring(startIdx, startIdx + 2000);
      expect(audioSection).toContain("sendMessageMutation.mutateAsync");
    });

    it("should have REST polling with setInterval", () => {
      expect(chatContent).toContain("setInterval");
      expect(chatContent).toContain("historyQuery.refetch");
    });

    it("should have markRead mutation", () => {
      expect(chatContent).toContain("markReadMutation");
      expect(chatContent).toContain("trpc.chat.markRead.useMutation");
    });
  });

  // === 2. Status always shows "Connected" ===
  describe("Status display is always Connected", () => {
    const chatContent = fs.readFileSync(path.join(projectRoot, "app/chat.tsx"), "utf-8");

    it("should always show Connected status text", () => {
      expect(chatContent).toContain('chatConnected || "Connected"');
    });

    it("should always use success color for status", () => {
      expect(chatContent).toContain("colors.success");
    });

    it("should NOT have conditional status based on WS state", () => {
      expect(chatContent).not.toContain('"disconnected"');
      expect(chatContent).not.toContain('"connecting"');
      // Should not have status === "connected" check (WS status)
      expect(chatContent).not.toMatch(/status === ["']connected["']/);
    });
  });

  // === 3. notification-provider.tsx is WebSocket-free ===
  describe("notification-provider.tsx is WebSocket-free", () => {
    const providerContent = fs.readFileSync(path.join(projectRoot, "lib/notification-provider.tsx"), "utf-8");

    it("should NOT import useWebSocket", () => {
      expect(providerContent).not.toContain("useWebSocket");
      expect(providerContent).not.toContain("use-websocket");
    });

    it("should NOT expose wsStatus/wsSend/wsOn/wsReconnect", () => {
      expect(providerContent).not.toContain("wsStatus");
      expect(providerContent).not.toContain("wsSend");
      expect(providerContent).not.toContain("wsOn");
      expect(providerContent).not.toContain("wsReconnect");
    });

    it("should still have badge count management", () => {
      expect(providerContent).toContain("setBadgeCountAsync");
      expect(providerContent).toContain("unreadQuery");
    });

    it("should still have push token", () => {
      expect(providerContent).toContain("expoPushToken");
    });

    it("should refresh queries on app foreground", () => {
      expect(providerContent).toContain("AppState.addEventListener");
      expect(providerContent).toContain('"active"');
    });

    it("should poll unread count with refetchInterval", () => {
      expect(providerContent).toContain("refetchInterval");
    });
  });

  // === 4. No hidden technical text ===
  describe("No technical text visible to users", () => {
    const chatContent = fs.readFileSync(path.join(projectRoot, "app/chat.tsx"), "utf-8");

    it("should NOT show REST mode text in UI strings", () => {
      // No user-visible strings containing REST mode
      expect(chatContent).not.toContain('"REST mode"');
      expect(chatContent).not.toContain('"REST polling"');
    });

    it("should NOT show WebSocket text in UI strings", () => {
      // No user-visible strings containing WebSocket
      expect(chatContent).not.toContain('"WebSocket"');
      expect(chatContent).not.toContain('"WS connected"');
      expect(chatContent).not.toContain('"WS disconnected"');
    });
  });

  // === 5. Background notification task still works ===
  describe("Background notification task is preserved", () => {
    const bgContent = fs.readFileSync(path.join(projectRoot, "lib/background-notifications.ts"), "utf-8");
    const layoutContent = fs.readFileSync(path.join(projectRoot, "app/_layout.tsx"), "utf-8");

    it("should still have background notification task defined", () => {
      expect(bgContent).toContain("TaskManager.defineTask");
      expect(bgContent).toContain("BACKGROUND_NOTIFICATION");
    });

    it("should still register task in _layout.tsx", () => {
      expect(layoutContent).toContain("registerBackgroundNotificationTask");
    });
  });

  // === 6. Push notifications still work ===
  describe("Push notifications are preserved", () => {
    const hookContent = fs.readFileSync(path.join(projectRoot, "hooks/use-push-notifications.ts"), "utf-8");

    it("should still have notification tap navigation", () => {
      expect(hookContent).toContain("addNotificationResponseReceivedListener");
      expect(hookContent).toContain('pathname: "/chat"');
    });

    it("should still handle cold start notifications", () => {
      expect(hookContent).toContain("getLastNotificationResponseAsync");
    });
  });
});
