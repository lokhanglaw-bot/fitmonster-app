import { describe, it, expect, vi } from "vitest";
import * as fs from "fs";
import * as path from "path";

describe("Round 60: Real-time Chat, Push Notifications, UI Cleanup", () => {
  // Feature 1: WebSocket real-time chat
  describe("WebSocket server module", () => {
    it("should export setupWebSocket function", async () => {
      const wsModule = await import("../server/websocket");
      expect(wsModule.setupWebSocket).toBeDefined();
      expect(typeof wsModule.setupWebSocket).toBe("function");
    });

    it("should export sendToUser function", async () => {
      const wsModule = await import("../server/websocket");
      expect(wsModule.sendToUser).toBeDefined();
      expect(typeof wsModule.sendToUser).toBe("function");
    });
  });

  describe("Chat database module", () => {
    it("should export all required chat functions", async () => {
      const chatDb = await import("../server/chat-db");
      expect(chatDb.saveMessage).toBeDefined();
      expect(chatDb.getChatHistory).toBeDefined();
      expect(chatDb.markMessagesAsRead).toBeDefined();
      expect(chatDb.getUnreadCount).toBeDefined();
      expect(chatDb.getUnreadCountByFriend).toBeDefined();
      expect(chatDb.getConversationPreviews).toBeDefined();
      expect(chatDb.savePushToken).toBeDefined();
      expect(chatDb.getUserPushTokens).toBeDefined();
      expect(chatDb.removePushToken).toBeDefined();
    });
  });

  // Feature 2: Push notifications
  describe("Push notification module", () => {
    it("should export sendPushNotification function", async () => {
      const pushModule = await import("../server/push-notifications");
      expect(pushModule.sendPushNotification).toBeDefined();
      expect(typeof pushModule.sendPushNotification).toBe("function");
    });

    it("should export sendChatPushNotification function", async () => {
      const pushModule = await import("../server/push-notifications");
      expect(pushModule.sendChatPushNotification).toBeDefined();
      expect(typeof pushModule.sendChatPushNotification).toBe("function");
    });
  });

  // Feature 3: Seed button removed from battle.tsx
  describe("Seed test users button removed", () => {
    it("should not contain seed test users button in battle.tsx", () => {
      const battlePath = path.join(__dirname, "../app/(tabs)/battle.tsx");
      const content = fs.readFileSync(battlePath, "utf-8");
      expect(content).not.toContain("Seed 100 Test Users");
      expect(content).not.toContain("insertFakeUsersMutation");
      expect(content).not.toContain("deleteFakeUsersMutation");
      expect(content).not.toContain("seedingFakes");
      expect(content).not.toContain("fakeUserIds");
    });
  });

  // Schema: chatMessages and pushTokens tables
  describe("Database schema", () => {
    it("should have chatMessages table in schema", () => {
      const schemaPath = path.join(__dirname, "../drizzle/schema.ts");
      const content = fs.readFileSync(schemaPath, "utf-8");
      expect(content).toContain("chatMessages");
      expect(content).toContain("senderId");
      expect(content).toContain("receiverId");
      expect(content).toContain("messageType");
    });

    it("should have pushTokens table in schema", () => {
      const schemaPath = path.join(__dirname, "../drizzle/schema.ts");
      const content = fs.readFileSync(schemaPath, "utf-8");
      expect(content).toContain("pushTokens");
    });
  });

  // Chat screen uses WebSocket
  describe("Chat screen", () => {
    it("should import useWebSocket hook", () => {
      const chatPath = path.join(__dirname, "../app/chat.tsx");
      const content = fs.readFileSync(chatPath, "utf-8");
      expect(content).toContain("useWebSocket");
      expect(content).not.toContain("AUTO_REPLIES");
      expect(content).not.toContain("Coming Soon");
    });

    it("should have send message functionality", () => {
      const chatPath = path.join(__dirname, "../app/chat.tsx");
      const content = fs.readFileSync(chatPath, "utf-8");
      expect(content).toContain("send_message");
      expect(content).toContain("handleSend");
    });

    it("should have message history loading", () => {
      const chatPath = path.join(__dirname, "../app/chat.tsx");
      const content = fs.readFileSync(chatPath, "utf-8");
      expect(content).toContain("get_history");
      expect(content).toContain("chat_history");
    });
  });

  // NotificationProvider in _layout.tsx
  describe("Notification integration", () => {
    it("should have NotificationProvider in root layout", () => {
      const layoutPath = path.join(__dirname, "../app/_layout.tsx");
      const content = fs.readFileSync(layoutPath, "utf-8");
      expect(content).toContain("NotificationProvider");
      expect(content).toContain("notification-provider");
    });
  });

  // Server index.ts includes WebSocket setup
  describe("Server WebSocket integration", () => {
    it("should setup WebSocket in server index", () => {
      const indexPath = path.join(__dirname, "../server/_core/index.ts");
      const content = fs.readFileSync(indexPath, "utf-8");
      expect(content).toContain("setupWebSocket");
      expect(content).toContain("../websocket");
    });
  });

  // Routers include chat and pushToken routes
  describe("API routes", () => {
    it("should have chat routes in routers", () => {
      const routersPath = path.join(__dirname, "../server/routers.ts");
      const content = fs.readFileSync(routersPath, "utf-8");
      expect(content).toContain("chat: router");
      expect(content).toContain("history: protectedProcedure");
      expect(content).toContain("conversations: protectedProcedure");
    });

    it("should have pushToken routes in routers", () => {
      const routersPath = path.join(__dirname, "../server/routers.ts");
      const content = fs.readFileSync(routersPath, "utf-8");
      expect(content).toContain("pushToken: router");
      expect(content).toContain("register: protectedProcedure");
    });

    it("should send notifications on friend request", () => {
      const routersPath = path.join(__dirname, "../server/routers.ts");
      const content = fs.readFileSync(routersPath, "utf-8");
      expect(content).toContain("sendPushNotification");
      expect(content).toContain("sendToUser");
    });
  });
});
