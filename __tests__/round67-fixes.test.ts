import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const projectRoot = path.resolve(__dirname, "..");

describe("Round 67 Bug Fixes", () => {
  describe("Chat uses shared WebSocket from NotificationProvider", () => {
    it("chat.tsx should NOT create its own useWebSocket instance", () => {
      const chatCode = fs.readFileSync(path.join(projectRoot, "app/chat.tsx"), "utf-8");
      // Should NOT import useWebSocket directly
      expect(chatCode).not.toMatch(/import.*useWebSocket.*from.*use-websocket/);
      // Should use useNotifications instead
      expect(chatCode).toMatch(/useNotifications/);
    });

    it("chat.tsx should use wsStatus, wsSend, wsOn from NotificationProvider", () => {
      const chatCode = fs.readFileSync(path.join(projectRoot, "app/chat.tsx"), "utf-8");
      expect(chatCode).toMatch(/wsStatus.*wsSend.*wsOn/);
    });

    it("chat.tsx should have a loading timeout to prevent infinite spinner", () => {
      const chatCode = fs.readFileSync(path.join(projectRoot, "app/chat.tsx"), "utf-8");
      expect(chatCode).toMatch(/Loading timeout reached/);
    });
  });

  describe("WebSocket hook improvements", () => {
    it("useWebSocket should not permanently give up on auth failure", () => {
      const wsCode = fs.readFileSync(path.join(projectRoot, "hooks/use-websocket.ts"), "utf-8");
      // Should NOT have authFailedRef (boolean flag that permanently blocks reconnection)
      expect(wsCode).not.toMatch(/authFailedRef/);
      // Should have authFailCountRef (counter with max retries)
      expect(wsCode).toMatch(/authFailCountRef/);
      expect(wsCode).toMatch(/maxAuthRetries/);
    });

    it("useWebSocket should prevent concurrent connection attempts", () => {
      const wsCode = fs.readFileSync(path.join(projectRoot, "hooks/use-websocket.ts"), "utf-8");
      expect(wsCode).toMatch(/isConnectingRef/);
    });

    it("useWebSocket should always send userId in auth message", () => {
      const wsCode = fs.readFileSync(path.join(projectRoot, "hooks/use-websocket.ts"), "utf-8");
      // Should send userId in auth message
      expect(wsCode).toMatch(/userId:\s*userId/);
    });

    it("useWebSocket should reset counters on app foreground", () => {
      const wsCode = fs.readFileSync(path.join(projectRoot, "hooks/use-websocket.ts"), "utf-8");
      expect(wsCode).toMatch(/authFailCountRef\.current\s*=\s*0/);
    });
  });

  describe("WebSocket server fallback auth", () => {
    it("server websocket.ts should have fallback userId auth", () => {
      const wsServerCode = fs.readFileSync(path.join(projectRoot, "server/websocket.ts"), "utf-8");
      expect(wsServerCode).toMatch(/fallback/i);
      expect(wsServerCode).toMatch(/getUserById/);
    });

    it("server websocket.ts should log the userId being used for fallback", () => {
      const wsServerCode = fs.readFileSync(path.join(projectRoot, "server/websocket.ts"), "utf-8");
      expect(wsServerCode).toMatch(/Trying fallback auth with userId/);
    });
  });

  describe("Chat disconnected state shows proper UI", () => {
    it("chat.tsx should show disconnected message when WS is not connected", () => {
      const chatCode = fs.readFileSync(path.join(projectRoot, "app/chat.tsx"), "utf-8");
      expect(chatCode).toMatch(/status === "disconnected"/);
      expect(chatCode).toMatch(/chatDisconnectedHint|Please check your connection/);
    });
  });

  describe("Friend card icons are location toggle", () => {
    it("battle.tsx should have hideLocation toggle on friend cards", () => {
      const battleCode = fs.readFileSync(path.join(projectRoot, "app/(tabs)/battle.tsx"), "utf-8");
      expect(battleCode).toMatch(/handleToggleHideLocation/);
      expect(battleCode).toMatch(/hideLocBtn/);
    });
  });
});
