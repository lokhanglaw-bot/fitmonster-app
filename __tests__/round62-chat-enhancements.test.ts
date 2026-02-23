import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const projectRoot = path.resolve(__dirname, "..");

function readFile(relPath: string): string {
  return fs.readFileSync(path.join(projectRoot, relPath), "utf-8");
}

describe("Round 62: Chat Enhancements", () => {
  describe("Feature 1: Unread message badge on friend list", () => {
    it("should query unread counts in battle.tsx", () => {
      const battle = readFile("app/(tabs)/battle.tsx");
      expect(battle).toContain("chat.conversations");
    });

    it("should render unread badge UI in friend list", () => {
      const battle = readFile("app/(tabs)/battle.tsx");
      expect(battle).toContain("unreadBadge");
      expect(battle).toContain("unreadBadgeText");
    });

    it("should have unreadBadge styles defined", () => {
      const battle = readFile("app/(tabs)/battle.tsx");
      expect(battle).toContain("unreadBadge:");
      expect(battle).toContain("unreadBadgeText:");
    });
  });

  describe("Feature 2: Camera photo sending", () => {
    it("should import ImagePicker in chat.tsx", () => {
      const chat = readFile("app/chat.tsx");
      expect(chat).toContain("expo-image-picker");
    });

    it("should have handleTakePhoto function", () => {
      const chat = readFile("app/chat.tsx");
      expect(chat).toContain("handleTakePhoto");
    });

    it("should request camera permissions", () => {
      const chat = readFile("app/chat.tsx");
      expect(chat).toContain("requestCameraPermissionsAsync");
    });

    it("should have launchCameraAsync call", () => {
      const chat = readFile("app/chat.tsx");
      expect(chat).toContain("launchCameraAsync");
    });

    it("should have attachment action sheet with camera and gallery options", () => {
      const chat = readFile("app/chat.tsx");
      expect(chat).toContain("handleAttachment");
      expect(chat).toContain("chatAttachCamera");
      expect(chat).toContain("chatAttachGallery");
    });

    it("should have camera icon in icon-symbol.tsx", () => {
      const icons = readFile("components/ui/icon-symbol.tsx");
      expect(icons).toContain('"camera"');
      expect(icons).toContain('"camera-alt"');
    });
  });

  describe("Feature 3: Voice messages", () => {
    it("should have recording state management", () => {
      const chat = readFile("app/chat.tsx");
      expect(chat).toContain("isRecording");
      expect(chat).toContain("recordingDuration");
      expect(chat).toContain("startRecording");
      expect(chat).toContain("stopRecording");
      expect(chat).toContain("cancelRecording");
    });

    it("should request recording permissions", () => {
      const chat = readFile("app/chat.tsx");
      expect(chat).toContain("requestRecordingPermissionsAsync");
    });

    it("should set audio mode for recording", () => {
      const chat = readFile("app/chat.tsx");
      expect(chat).toContain("allowsRecording: true");
    });

    it("should have recording UI with cancel and send buttons", () => {
      const chat = readFile("app/chat.tsx");
      expect(chat).toContain("recordingBar");
      expect(chat).toContain("recordingCancelBtn");
      expect(chat).toContain("recordingSendBtn");
      expect(chat).toContain("recordingDot");
    });

    it("should have mic button that switches to send when text is entered", () => {
      const chat = readFile("app/chat.tsx");
      expect(chat).toContain("mic.fill");
      expect(chat).toContain("inputText.trim()");
    });

    it("should upload audio to server", () => {
      const chat = readFile("app/chat.tsx");
      expect(chat).toContain("uploadAudioMutation");
      expect(chat).toContain("chat.uploadAudio");
    });

    it("should have audio message rendering with waveform and play button", () => {
      const chat = readFile("app/chat.tsx");
      expect(chat).toContain("audioRow");
      expect(chat).toContain("audioPlayBtn");
      expect(chat).toContain("audioWaveContainer");
      expect(chat).toContain("audioWaveBar");
      expect(chat).toContain("audioDuration");
    });

    it("should have audio playback functionality", () => {
      const chat = readFile("app/chat.tsx");
      expect(chat).toContain("handlePlayAudio");
      expect(chat).toContain("playingAudioId");
      expect(chat).toContain("createAudioPlayer");
    });

    it("should have uploadAudio API in server routers", () => {
      const routers = readFile("server/routers.ts");
      expect(routers).toContain("uploadAudio");
      expect(routers).toContain("chat-audio");
    });

    it("should support audio messageType in schema", () => {
      const schema = readFile("drizzle/schema.ts");
      expect(schema).toContain("audio");
    });

    it("should have pulse animation for recording indicator", () => {
      const chat = readFile("app/chat.tsx");
      expect(chat).toContain("pulseAnim");
      expect(chat).toContain("RNAnimated.loop");
    });
  });

  describe("i18n translations", () => {
    it("should have voice message translations in en", () => {
      const i18n = readFile("lib/i18n-context.tsx");
      expect(i18n).toContain("chatVoiceRecord");
      expect(i18n).toContain("chatVoiceRecording");
      expect(i18n).toContain("chatVoiceSending");
      expect(i18n).toContain("chatVoiceFailed");
      expect(i18n).toContain("chatVoicePermission");
    });

    it("should have camera/attachment translations in en", () => {
      const i18n = readFile("lib/i18n-context.tsx");
      expect(i18n).toContain("chatCameraPermission");
      expect(i18n).toContain("chatAttachTitle");
      expect(i18n).toContain("chatAttachCamera");
      expect(i18n).toContain("chatAttachGallery");
    });

    it("should have zh translations for voice and camera", () => {
      const i18n = readFile("lib/i18n-context.tsx");
      expect(i18n).toContain("錄音中");
      expect(i18n).toContain("需要麥克風權限");
      expect(i18n).toContain("需要相機權限");
      expect(i18n).toContain("拍照");
    });
  });

  describe("WebSocket audio support", () => {
    it("should handle audio messageType in websocket", () => {
      const ws = readFile("server/websocket.ts");
      expect(ws).toContain("messageType");
    });

    it("should save audio messages to database", () => {
      const chatDb = readFile("server/chat-db.ts");
      expect(chatDb).toContain("audio");
    });
  });
});
