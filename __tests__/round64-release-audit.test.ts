/**
 * Round 64: Release Audit — Social Features Full Review
 * Tests all social feature code paths for release readiness.
 */
import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const ROOT = path.resolve(__dirname, "..");

function readFile(relPath: string): string {
  return fs.readFileSync(path.join(ROOT, relPath), "utf-8");
}

describe("Round 64: Release Audit — Social Features", () => {

  // ============================
  // AUDIT 1: Matching System
  // ============================
  describe("Audit 1: Matching system", () => {
    const battleCode = readFile("app/(tabs)/battle.tsx");

    it("should have swipe left (skip) handler", () => {
      expect(battleCode).toContain("handleSwipe");
      expect(battleCode).toMatch(/handleSwipe.*left/);
    });

    it("should have swipe right (like) handler", () => {
      expect(battleCode).toMatch(/handleSwipe.*right/);
    });

    it("should display daily swipe limit (50)", () => {
      expect(battleCode).toContain("swipesLeft");
      expect(battleCode).toContain("/50");
    });

    it("should show nearby opponents counter", () => {
      expect(battleCode).toContain("nearbyOpponents.length");
    });

    it("should have match tab navigation", () => {
      expect(battleCode).toContain('"match"');
      expect(battleCode).toContain('"requests"');
      expect(battleCode).toContain('"friends"');
    });

    it("should query nearby users from backend", () => {
      expect(battleCode).toContain("trpc.location.nearby");
    });

    it("should send friend request on like", () => {
      expect(battleCode).toContain("sendRequestMutation");
      expect(battleCode).toContain("sendRequest.useMutation");
    });

    it("should show opponent card with monster info", () => {
      expect(battleCode).toContain("opponentCard");
      expect(battleCode).toContain("opponent.name");
      expect(battleCode).toContain("opponent.level");
      expect(battleCode).toContain("opponent.monsterType");
    });

    it("should show match percentage", () => {
      expect(battleCode).toContain("matchPercent");
    });

    it("should show gender icon on opponent card", () => {
      expect(battleCode).toContain("opponent.gender");
    });
  });

  // ============================
  // AUDIT 2: Friend Request System
  // ============================
  describe("Audit 2: Friend request system", () => {
    const battleCode = readFile("app/(tabs)/battle.tsx");
    const routersCode = readFile("server/routers.ts");

    it("should have send friend request API", () => {
      expect(routersCode).toContain("sendRequest:");
      expect(routersCode).toContain("targetUserId");
    });

    it("should have accept friend request API", () => {
      expect(routersCode).toContain("acceptRequest:");
      expect(routersCode).toContain("friendshipId");
    });

    it("should have reject friend request API", () => {
      expect(routersCode).toContain("rejectRequest:");
    });

    it("should query pending requests from backend", () => {
      expect(battleCode).toContain("trpc.friends.pendingRequests");
    });

    it("should query sent requests from backend", () => {
      expect(battleCode).toContain("trpc.friends.sentRequests");
    });

    it("should have accept button with checkmark icon", () => {
      expect(battleCode).toContain("handleAcceptRequest");
      expect(battleCode).toContain("checkmark");
    });

    it("should have reject button with xmark icon", () => {
      expect(battleCode).toContain("handleRejectRequest");
      expect(battleCode).toContain("xmark");
    });

    it("should show sent requests with pending status", () => {
      expect(battleCode).toContain("sentRequests");
      expect(battleCode).toContain("pending");
    });

    it("should send push notification on friend request accept", () => {
      expect(routersCode).toContain("Friend Request Accepted");
      expect(routersCode).toContain("sendPushNotification");
    });

    it("should send WebSocket notification on friend accept", () => {
      expect(routersCode).toContain("friend_accepted");
      expect(routersCode).toContain("sendToUser");
    });
  });

  // ============================
  // AUDIT 3: Friend List
  // ============================
  describe("Audit 3: Friend list", () => {
    const battleCode = readFile("app/(tabs)/battle.tsx");
    const routersCode = readFile("server/routers.ts");

    it("should query friends list from backend", () => {
      expect(battleCode).toContain("trpc.friends.list.useQuery");
    });

    it("should display monster name (not real name)", () => {
      expect(battleCode).toContain("friend.name");
      // The name is derived from activeMonster.name
      expect(battleCode).toContain("activeMonster?.name");
    });

    it("should display monster type and level", () => {
      expect(battleCode).toContain("friend.monsterType");
      expect(battleCode).toContain("friend.level");
    });

    it("should show online status from real WebSocket data (not random)", () => {
      expect(battleCode).toContain("isOnline");
      // Friend online status should come from backend, not Math.random()
      // (Math.random is still used for battle damage/wild monsters, which is fine)
      expect(battleCode).toContain("f.isOnline || false");
      // Server should enrich with online status
      expect(routersCode).toContain("getOnlineStatuses");
      expect(routersCode).toContain("isOnline");
    });

    it("should show unread message badge on chat button", () => {
      expect(battleCode).toContain("unreadBadge");
      expect(battleCode).toContain("unreadCount");
    });

    it("should show last message preview", () => {
      expect(battleCode).toContain("lastMessage");
      expect(battleCode).toContain("📷 Photo");
      expect(battleCode).toContain("🎤 Voice");
    });

    it("should query conversations for unread counts", () => {
      expect(battleCode).toContain("trpc.chat.conversations.useQuery");
    });

    it("should have chat button that navigates to chat screen", () => {
      expect(battleCode).toContain('handleFriendAction(friend, "chat")');
      expect(battleCode).toContain("/chat");
      expect(battleCode).toContain("friendId");
      expect(battleCode).toContain("friendName");
    });

    it("should have battle button", () => {
      expect(battleCode).toContain('handleFriendAction(friend, "battle")');
    });

    it("should have hide location toggle", () => {
      expect(battleCode).toContain("handleToggleHideLocation");
      expect(battleCode).toContain("hideLocation");
    });
  });

  // ============================
  // AUDIT 4: Chat System
  // ============================
  describe("Audit 4: Chat system", () => {
    const chatCode = readFile("app/chat.tsx");
    const wsCode = readFile("server/websocket.ts");
    const chatDbCode = readFile("server/chat-db.ts");

    it("should use WebSocket for real-time messaging", () => {
      expect(chatCode).toContain("useWebSocket");
      expect(chatCode).toContain("status");
      expect(chatCode).toContain("send");
      expect(chatCode).toContain("on");
    });

    it("should authenticate WebSocket connection", () => {
      expect(wsCode).toContain("auth");
      expect(wsCode).toContain("authenticateRequest");
      expect(wsCode).toContain("auth_success");
    });

    it("should send text messages via WebSocket", () => {
      expect(chatCode).toContain("send_message");
      expect(chatCode).toContain('messageType: "text"');
    });

    it("should receive and display messages", () => {
      expect(chatCode).toContain("new_message");
      expect(chatCode).toContain("setMessages");
    });

    it("should prevent duplicate messages", () => {
      expect(chatCode).toContain("prev.some((m) => m.id === newMsg.id)");
    });

    it("should load chat history on connect", () => {
      expect(chatCode).toContain("get_history");
    });

    it("should mark messages as read", () => {
      expect(chatCode).toContain("mark_read");
      expect(wsCode).toContain("markMessagesAsRead");
    });

    it("should show read receipts (double check marks)", () => {
      expect(chatCode).toContain("✓✓");
      expect(chatCode).toContain("isRead");
    });

    it("should notify sender when messages are read", () => {
      expect(wsCode).toContain("messages_read");
      expect(wsCode).toContain("readerId");
    });

    it("should show typing indicator", () => {
      expect(chatCode).toContain("typing");
      expect(chatCode).toContain("isTyping");
    });

    it("should have emoji picker", () => {
      expect(chatCode).toContain("EmojiPicker");
      expect(chatCode).toContain("handleEmojiSelect");
      expect(chatCode).toContain("showEmojiPicker");
    });

    it("should support sending images (camera + gallery)", () => {
      expect(chatCode).toContain("handleAttachment");
      expect(chatCode).toContain("handleTakePhoto");
      expect(chatCode).toContain("handlePickImage");
      expect(chatCode).toContain("uploadAndSendImage");
      expect(chatCode).toContain('messageType: "image"');
    });

    it("should display image messages with preview", () => {
      expect(chatCode).toContain("chatImage");
      expect(chatCode).toContain("setPreviewImage");
      expect(chatCode).toContain("ImagePreviewModal");
    });

    it("should support voice messages", () => {
      expect(chatCode).toContain("startRecording");
      expect(chatCode).toContain("stopRecording");
      expect(chatCode).toContain("cancelRecording");
      expect(chatCode).toContain('messageType: "audio"');
    });

    it("should play audio messages", () => {
      expect(chatCode).toContain("handlePlayAudio");
      expect(chatCode).toContain("playingAudioId");
    });

    it("should show audio waveform visualization", () => {
      expect(chatCode).toContain("audioWaveContainer");
      expect(chatCode).toContain("audioWaveBar");
    });

    it("should show recording UI with duration and cancel", () => {
      expect(chatCode).toContain("isRecording");
      expect(chatCode).toContain("recordingDuration");
      expect(chatCode).toContain("recordingBar");
    });

    it("should persist messages in database", () => {
      expect(chatDbCode).toContain("saveMessage");
      expect(chatDbCode).toContain("getChatHistory");
    });

    it("should show connection status", () => {
      expect(chatCode).toContain("statusText");
      expect(chatCode).toContain("statusColor");
      expect(chatCode).toContain("Connected");
      expect(chatCode).toContain("Connecting");
      expect(chatCode).toContain("Disconnected");
    });

    it("should auto-scroll to latest messages", () => {
      expect(chatCode).toContain("scrollToEnd");
    });

    it("should have back button navigation", () => {
      expect(chatCode).toContain("router.back");
    });

    it("should enforce max message length", () => {
      expect(chatCode).toContain("maxLength={2000}");
    });

    it("should enforce max image size (5MB)", () => {
      expect(chatCode).toContain("5 * 1024 * 1024");
    });

    it("should enforce minimum voice recording duration", () => {
      expect(chatCode).toContain("duration < 1");
    });

    it("should send push notification for offline chat messages", () => {
      expect(wsCode).toContain("sendChatPushNotification");
      expect(wsCode).toContain("receiverOnline");
    });
  });

  // ============================
  // AUDIT 5: Nearby Map
  // ============================
  describe("Audit 5: Nearby map", () => {
    const mapCode = readFile("app/nearby-map.tsx");

    it("should request location permission", () => {
      expect(mapCode).toContain("requestForegroundPermissionsAsync");
    });

    it("should share location to server", () => {
      expect(mapCode).toContain("locationUpdateMutation");
      expect(mapCode).toContain("location.update");
    });

    it("should have location sharing toggle", () => {
      expect(mapCode).toContain("handleToggleSharing");
      expect(mapCode).toContain("sharingLocation");
      expect(mapCode).toContain("Switch");
    });

    it("should query nearby users", () => {
      expect(mapCode).toContain("trpc.location.nearby");
    });

    it("should display map with markers", () => {
      expect(mapCode).toContain("MapViewWrapper");
      expect(mapCode).toContain("markers");
    });

    it("should show monster avatar in nearby user cards", () => {
      expect(mapCode).toContain("getMonsterImage");
      expect(mapCode).toContain("monsterType");
    });

    it("should show monster level and type in user cards", () => {
      expect(mapCode).toContain("monsterLevel");
      expect(mapCode).toContain("EMOJI_BY_TYPE");
    });

    it("should have send friend request button", () => {
      expect(mapCode).toContain("handleSendRequest");
      expect(mapCode).toContain("person.badge.plus");
    });

    it("should have radius slider for match range", () => {
      expect(mapCode).toContain("Slider");
      expect(mapCode).toContain("radiusKm");
      expect(mapCode).toContain("handleRadiusChange");
    });

    it("should save radius to backend", () => {
      expect(mapCode).toContain("matchRadiusMutation");
    });

    it("should auto-refresh nearby users", () => {
      expect(mapCode).toContain("refetchInterval");
    });

    it("should periodically update own location", () => {
      expect(mapCode).toContain("LOCATION_UPDATE_INTERVAL_MS");
    });

    it("should have center-on-me button", () => {
      expect(mapCode).toContain("centerOnUser");
      expect(mapCode).toContain("location.fill");
    });

    it("should have manual refresh button", () => {
      expect(mapCode).toContain("handleManualRefresh");
    });

    it("should show distance for each nearby user", () => {
      expect(mapCode).toContain("distanceKm");
    });

    it("should show online status based on time", () => {
      expect(mapCode).toContain("getTimeAgo");
      expect(mapCode).toContain("isOnline");
    });
  });

  // ============================
  // AUDIT 6: Push Notifications
  // ============================
  describe("Audit 6: Push notifications", () => {
    const pushCode = readFile("server/push-notifications.ts");
    const routersCode = readFile("server/routers.ts");
    const wsCode = readFile("server/websocket.ts");

    it("should use Expo Push API", () => {
      expect(pushCode).toContain("exp.host/--/api/v2/push/send");
    });

    it("should handle invalid push tokens", () => {
      expect(pushCode).toContain("DeviceNotRegistered");
      expect(pushCode).toContain("removePushToken");
    });

    it("should send push for friend request accept", () => {
      expect(routersCode).toContain("Friend Request Accepted");
    });

    it("should send push for chat messages when offline", () => {
      expect(wsCode).toContain("sendChatPushNotification");
      expect(wsCode).toContain("!receiverOnline");
    });

    it("should include message preview in chat push", () => {
      expect(pushCode).toContain("sendChatPushNotification");
      expect(pushCode).toContain("messagePreview");
    });

    it("should have push token registration endpoint", () => {
      expect(routersCode).toContain("pushToken: router");
      expect(routersCode).toContain("register: protectedProcedure");
    });
  });

  // ============================
  // AUDIT 7: Privacy
  // ============================
  describe("Audit 7: Privacy protection", () => {
    const battleCode = readFile("app/(tabs)/battle.tsx");
    const mapCode = readFile("app/nearby-map.tsx");
    const routersCode = readFile("server/routers.ts");

    it("should display monster name in friend list, not real name", () => {
      // Friend name is derived from activeMonster.name
      expect(battleCode).toContain("activeMonster?.name");
      expect(battleCode).toContain("monsterName");
    });

    it("should display monster name on nearby map, not real name", () => {
      expect(mapCode).toContain("monsterName");
    });

    it("should use monster name in push notifications", () => {
      // Chat push uses senderName from getActiveMonster
      const wsCode = readFile("server/websocket.ts");
      expect(wsCode).toContain("getActiveMonster");
      expect(wsCode).toContain("senderName");
    });

    it("should have hide location feature for friends", () => {
      expect(battleCode).toContain("toggleHideLocation");
      expect(routersCode).toContain("toggleFriendHideLocation");
    });

    it("should protect test endpoints with authentication", () => {
      expect(routersCode).toContain("testLocation: router({");
      // Test endpoints should use protectedProcedure
      expect(routersCode).toMatch(/testLocation.*protectedProcedure/s);
    });

    it("should not expose real user email or personal info in nearby query", () => {
      // The nearby query should only return monster info
      expect(routersCode).toContain("monsterName");
      expect(routersCode).toContain("monsterType");
      // Should not return email
      expect(routersCode).not.toMatch(/email.*nearby/i);
    });
  });

  // ============================
  // AUDIT 8: Icon Mappings
  // ============================
  describe("Audit 8: All required icons are mapped", () => {
    const iconCode = readFile("components/ui/icon-symbol.tsx");

    const requiredIcons = [
      "house.fill",
      "paperplane.fill",
      "arrow.left",
      "message.fill",
      "person.badge.plus",
      "map.fill",
      "location.fill",
      "camera",
      "mic.fill",
      "play.fill",
      "pause.fill",
      "xmark",
      "checkmark",
      "arrow.clockwise",
      "face.smiling",
    ];

    requiredIcons.forEach((icon) => {
      it(`should have mapping for "${icon}"`, () => {
        expect(iconCode).toContain(`"${icon}"`);
      });
    });
  });

  // ============================
  // AUDIT 9: WebSocket Robustness
  // ============================
  describe("Audit 9: WebSocket robustness", () => {
    const wsHookCode = readFile("hooks/use-websocket.ts");
    const wsServerCode = readFile("server/websocket.ts");

    it("should handle multiple device connections per user", () => {
      expect(wsServerCode).toContain("Set<WebSocket>");
    });

    it("should clean up connections on disconnect", () => {
      expect(wsServerCode).toContain("ws.on(\"close\"");
      expect(wsServerCode).toContain("connections.delete(ws)");
    });

    it("should handle WebSocket errors", () => {
      expect(wsServerCode).toContain("ws.on(\"error\"");
    });

    it("should have reconnection logic in client", () => {
      expect(wsHookCode).toContain("reconnect");
    });

    it("should check WebSocket readyState before sending", () => {
      expect(wsServerCode).toContain("readyState === WebSocket.OPEN");
    });

    it("should export isUserOnline helper", () => {
      expect(wsServerCode).toContain("export function isUserOnline");
    });

    it("should export getOnlineStatuses helper", () => {
      expect(wsServerCode).toContain("export function getOnlineStatuses");
    });
  });
});
