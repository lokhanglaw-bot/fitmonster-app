import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const projectRoot = path.resolve(__dirname, "..");
const chatContent = fs.readFileSync(path.join(projectRoot, "app/chat.tsx"), "utf-8");

describe("Round 77: Chat UX Fixes + Smart Polling", () => {
  // === 1. Send debounce + isSending lock ===
  describe("Send debounce and isSending lock", () => {
    it("should have isSending state", () => {
      expect(chatContent).toContain("const [isSending, setIsSending] = useState(false)");
    });

    it("should have lastSendTimeRef for debounce", () => {
      expect(chatContent).toContain("lastSendTimeRef");
    });

    it("should check debounce time (300ms) in handleSend", () => {
      expect(chatContent).toContain("now - lastSendTimeRef.current < 300");
    });

    it("should check isSending lock in handleSend", () => {
      expect(chatContent).toContain("if (isSending) return");
    });

    it("should set isSending true before sending", () => {
      const handleSendSection = chatContent.substring(
        chatContent.indexOf("const handleSend = useCallback"),
        chatContent.indexOf("const handleSend = useCallback") + 1500
      );
      expect(handleSendSection).toContain("setIsSending(true)");
    });

    it("should set isSending false in finally block", () => {
      const handleSendSection = chatContent.substring(
        chatContent.indexOf("const handleSend = useCallback"),
        chatContent.indexOf("const handleSend = useCallback") + 2000
      );
      expect(handleSendSection).toContain("setIsSending(false)");
    });

    it("should clear input immediately before await for responsiveness", () => {
      const handleSendSection = chatContent.substring(
        chatContent.indexOf("const handleSend = useCallback"),
        chatContent.indexOf("const handleSend = useCallback") + 1500
      );
      const clearIdx = handleSendSection.indexOf('setInputText("")');
      const awaitIdx = handleSendSection.indexOf("await sendMessageMutation.mutateAsync");
      expect(clearIdx).toBeLessThan(awaitIdx);
    });

    it("should restore input text on send failure", () => {
      expect(chatContent).toContain("setInputText(text)");
    });

    it("should disable send button when isSending", () => {
      expect(chatContent).toContain("disabled={isSending}");
    });

    it("should show ActivityIndicator when isSending", () => {
      // The send button should show a spinner when sending
      expect(chatContent).toContain("isSending ? (");
      expect(chatContent).toContain('ActivityIndicator size="small" color="#fff"');
    });
  });

  // === 2. Back button fix ===
  describe("Back button navigation", () => {
    it("should have a handleBack callback", () => {
      expect(chatContent).toContain("const handleBack = useCallback");
    });

    it("should try router.canDismiss first", () => {
      expect(chatContent).toContain("router.canDismiss()");
    });

    it("should try router.canGoBack as fallback", () => {
      expect(chatContent).toContain("router.canGoBack()");
    });

    it("should have ultimate fallback to tabs", () => {
      expect(chatContent).toContain('router.replace("/(tabs)")');
    });

    it("should use handleBack in the back button onPress", () => {
      expect(chatContent).toContain("onPress={handleBack}");
    });
  });

  // === 3. Keyboard and scroll improvements ===
  describe("Keyboard and scroll improvements", () => {
    it("should use requestAnimationFrame for scrollToBottom", () => {
      expect(chatContent).toContain("requestAnimationFrame");
      expect(chatContent).toContain("scrollToEnd");
    });

    it("should scroll to bottom when keyboard shows", () => {
      expect(chatContent).toContain("keyboardDidShow");
      expect(chatContent).toContain("scrollToBottom");
    });

    it("should scroll to bottom after sending a message", () => {
      const handleSendSection = chatContent.substring(
        chatContent.indexOf("const handleSend = useCallback"),
        chatContent.indexOf("const handleSend = useCallback") + 1500
      );
      expect(handleSendSection).toContain("scrollToBottom");
    });

    it("should have keyboardShouldPersistTaps on FlatList", () => {
      expect(chatContent).toContain('keyboardShouldPersistTaps="handled"');
    });

    it("should have keyboardDismissMode on FlatList", () => {
      expect(chatContent).toContain('keyboardDismissMode="interactive"');
    });

    it("should use behavior height on Android", () => {
      expect(chatContent).toContain('behavior={Platform.OS === "ios" ? "padding" : "height"}');
    });
  });

  // === 4. Smart adaptive polling ===
  describe("Smart adaptive polling", () => {
    it("should define NORMAL_POLL_INTERVAL as 4000", () => {
      expect(chatContent).toContain("NORMAL_POLL_INTERVAL = 4000");
    });

    it("should define ACCELERATED_POLL_INTERVAL as 2000", () => {
      expect(chatContent).toContain("ACCELERATED_POLL_INTERVAL = 2000");
    });

    it("should define ACCELERATED_DURATION as 30000", () => {
      expect(chatContent).toContain("ACCELERATED_DURATION = 30000");
    });

    it("should have acceleratedUntilRef for tracking acceleration window", () => {
      expect(chatContent).toContain("acceleratedUntilRef");
    });

    it("should have activateAcceleratedPolling helper", () => {
      expect(chatContent).toContain("const activateAcceleratedPolling");
    });

    it("should log polling mode changes", () => {
      expect(chatContent).toContain('[Chat] Polling mode: accelerated (2s) - new message received');
      expect(chatContent).toContain('[Chat] Polling mode: normal (4s)');
    });

    it("should use setTimeout-based scheduling (not setInterval)", () => {
      expect(chatContent).toContain("const schedulePoll");
      expect(chatContent).toContain("pollTimerRef.current = setTimeout");
    });

    it("should activate accelerated polling when new message from friend arrives", () => {
      // When history data changes and last message is from friend, activate
      expect(chatContent).toContain("lastMsg.senderId !== myId");
      expect(chatContent).toContain("activateAcceleratedPolling()");
    });

    it("should activate accelerated polling after sending a message", () => {
      const handleSendSection = chatContent.substring(
        chatContent.indexOf("const handleSend = useCallback"),
        chatContent.indexOf("const handleSend = useCallback") + 1500
      );
      expect(handleSendSection).toContain("activateAcceleratedPolling");
    });

    it("should clean up poll timer on unmount", () => {
      expect(chatContent).toContain("clearTimeout(pollTimerRef.current)");
    });
  });

  // === 5. No old polling code ===
  describe("Old polling code removed", () => {
    it("should NOT have old 5000ms setInterval polling", () => {
      expect(chatContent).not.toContain("5000");
    });

    it("should NOT have restPollRef setInterval", () => {
      // restPollRef should exist but not be used with setInterval for polling
      // The new code uses setTimeout-based schedulePoll
      expect(chatContent).not.toContain("restPollRef.current = setInterval");
    });
  });
});
