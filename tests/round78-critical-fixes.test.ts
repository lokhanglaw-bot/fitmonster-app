import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const projectRoot = path.resolve(__dirname, "..");
const pushNotifContent = fs.readFileSync(path.join(projectRoot, "server/push-notifications.ts"), "utf-8");
const routersContent = fs.readFileSync(path.join(projectRoot, "server/routers.ts"), "utf-8");
const wsContent = fs.readFileSync(path.join(projectRoot, "server/websocket.ts"), "utf-8");
const usePushContent = fs.readFileSync(path.join(projectRoot, "hooks/use-push-notifications.ts"), "utf-8");
const chatContent = fs.readFileSync(path.join(projectRoot, "app/chat.tsx"), "utf-8");

describe("Round 78: Critical UX Bug Fixes", () => {
  // === 1. Server-side push notification deduplication ===
  describe("Server push dedup", () => {
    it("should have a recentPushes dedup cache", () => {
      expect(pushNotifContent).toContain("const recentPushes = new Map");
    });

    it("should have isDuplicate function", () => {
      expect(pushNotifContent).toContain("function isDuplicate(messageId: number)");
    });

    it("should check isDuplicate before sending push", () => {
      expect(pushNotifContent).toContain("if (messageId && isDuplicate(messageId))");
    });

    it("should have cleanup interval for dedup cache", () => {
      expect(pushNotifContent).toContain("setInterval(cleanupDedup");
    });

    it("sendChatPushNotification should accept messageId parameter", () => {
      expect(pushNotifContent).toContain("messageId?: number");
    });

    it("should include messageId in push data payload", () => {
      expect(pushNotifContent).toContain("messageId: messageId || 0");
    });

    it("should log when skipping duplicate push", () => {
      expect(pushNotifContent).toContain("Skipping duplicate push for messageId");
    });
  });

  // === 2. REST sendMessage no longer calls sendToUser for WS ===
  describe("REST sendMessage cleanup", () => {
    it("should NOT call sendToUser in the sendMessage mutation", () => {
      // Find the sendMessage section
      const sendMsgStart = routersContent.indexOf("sendMessage: protectedProcedure");
      const sendMsgEnd = routersContent.indexOf("return savedMsg;", sendMsgStart);
      const sendMsgSection = routersContent.substring(sendMsgStart, sendMsgEnd);
      expect(sendMsgSection).not.toContain("sendToUser(receiverId");
      expect(sendMsgSection).not.toContain("sendToUser(senderId");
    });

    it("should pass messageId to sendChatPushNotification in REST", () => {
      const sendMsgStart = routersContent.indexOf("sendMessage: protectedProcedure");
      const sendMsgEnd = routersContent.indexOf("return savedMsg;", sendMsgStart);
      const sendMsgSection = routersContent.substring(sendMsgStart, sendMsgEnd);
      expect(sendMsgSection).toContain("savedMsg.id)");
    });

    it("should pass messageId to sendChatPushNotification in WS", () => {
      expect(wsContent).toContain("savedMsg.id)");
    });
  });

  // === 3. Client notification handler dedup + debounce ===
  describe("Client notification handler", () => {
    it("should have _isNavigating debounce flag", () => {
      expect(usePushContent).toContain("let _isNavigating = false");
    });

    it("should have _handledIdentifiers dedup set", () => {
      expect(usePushContent).toContain("const _handledIdentifiers = new Set");
    });

    it("should have cooldown constants", () => {
      expect(usePushContent).toContain("GLOBAL_COOLDOWN_MS");
      expect(usePushContent).toContain("SAME_CHAT_COOLDOWN_MS");
    });

    it("should check _isNavigating before navigating", () => {
      expect(usePushContent).toContain("if (_isNavigating)");
    });

    it("should check _handledIdentifiers before handling", () => {
      expect(usePushContent).toContain("_handledIdentifiers.has(identifier)");
    });

    it("should have canNavigate function with multi-layer checks", () => {
      expect(usePushContent).toContain("function canNavigate");
    });

    it("should clean up existing listeners before adding new ones", () => {
      // The useEffect should remove old listeners first
      const effectSection = usePushContent.substring(
        usePushContent.indexOf("useEffect(() => {"),
        usePushContent.lastIndexOf("return () => {")
      );
      // Should remove existing listeners before adding new ones
      expect(effectSection).toContain("notificationListener.current.remove()");
      expect(effectSection).toContain("responseListener.current.remove()");
    });
  });

  // === 4. Cold start navigation uses replace ===
  describe("Cold start navigation", () => {
    it("should use router.replace for cold start", () => {
      expect(usePushContent).toContain("router.replace(");
    });

    it("should use router.push for warm start", () => {
      expect(usePushContent).toContain("router.push(");
    });

    it("should have isColdStart parameter in navigateToChat", () => {
      expect(usePushContent).toContain("isColdStart: boolean");
    });

    it("should only handle cold start once", () => {
      expect(usePushContent).toContain("coldStartHandled.current");
      expect(usePushContent).toContain("coldStartHandled.current = true");
    });

    it("should pass isColdStart=true for getLastNotificationResponseAsync", () => {
      expect(usePushContent).toContain("handleNotificationTap(response, true)");
    });

    it("should pass isColdStart=false for live notification taps", () => {
      expect(usePushContent).toContain("handleNotificationTap(response, false)");
    });
  });

  // === 5. Image upload protection ===
  describe("Image upload protection", () => {
    it("should guard uploadAndSendImage with uploadingImage check", () => {
      expect(chatContent).toContain("if (uploadingImage) return;");
    });

    it("should have uploadingImage in uploadAndSendImage deps", () => {
      // The useCallback dependency array should include uploadingImage
      const uploadSection = chatContent.substring(
        chatContent.indexOf("const uploadAndSendImage = useCallback"),
        chatContent.indexOf("const uploadAndSendImage = useCallback") + 3000
      );
      expect(uploadSection).toContain("uploadingImage");
    });

    it("should disable attachment button when uploading", () => {
      expect(chatContent).toContain("disabled={uploadingImage}");
    });
  });
});
