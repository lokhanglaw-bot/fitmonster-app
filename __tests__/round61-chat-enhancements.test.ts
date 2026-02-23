import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

describe("Round 61: Chat Enhancements - Emoji Picker & Image Sending", () => {
  // --- Emoji Picker Component ---
  describe("Emoji Picker Component", () => {
    it("emoji-picker.tsx file exists", () => {
      const filePath = path.resolve(__dirname, "../components/emoji-picker.tsx");
      expect(fs.existsSync(filePath)).toBe(true);
    });

    it("emoji-picker has multiple emoji categories", () => {
      const content = fs.readFileSync(
        path.resolve(__dirname, "../components/emoji-picker.tsx"),
        "utf-8"
      );
      expect(content).toContain("EMOJI_CATEGORIES");
      expect(content).toContain("Smileys");
      expect(content).toContain("Gestures");
      expect(content).toContain("Hearts");
      expect(content).toContain("Fitness");
      expect(content).toContain("Objects");
    });

    it("emoji-picker has onSelect callback", () => {
      const content = fs.readFileSync(
        path.resolve(__dirname, "../components/emoji-picker.tsx"),
        "utf-8"
      );
      expect(content).toContain("onSelect: (emoji: string) => void");
    });

    it("emoji-picker uses FlatList for performance", () => {
      const content = fs.readFileSync(
        path.resolve(__dirname, "../components/emoji-picker.tsx"),
        "utf-8"
      );
      expect(content).toContain("FlatList");
      expect(content).toContain("getItemLayout");
    });
  });

  // --- Image Preview Modal ---
  describe("Image Preview Modal", () => {
    it("image-preview-modal.tsx file exists", () => {
      const filePath = path.resolve(__dirname, "../components/image-preview-modal.tsx");
      expect(fs.existsSync(filePath)).toBe(true);
    });

    it("image-preview-modal uses expo-image for display", () => {
      const content = fs.readFileSync(
        path.resolve(__dirname, "../components/image-preview-modal.tsx"),
        "utf-8"
      );
      expect(content).toContain("expo-image");
      expect(content).toContain("Modal");
      expect(content).toContain("contentFit");
    });
  });

  // --- Chat Screen ---
  describe("Chat Screen with Emoji & Image", () => {
    it("chat.tsx imports EmojiPicker", () => {
      const content = fs.readFileSync(
        path.resolve(__dirname, "../app/chat.tsx"),
        "utf-8"
      );
      expect(content).toContain("EmojiPicker");
      expect(content).toContain("emoji-picker");
    });

    it("chat.tsx imports ImagePreviewModal", () => {
      const content = fs.readFileSync(
        path.resolve(__dirname, "../app/chat.tsx"),
        "utf-8"
      );
      expect(content).toContain("ImagePreviewModal");
      expect(content).toContain("image-preview-modal");
    });

    it("chat.tsx imports expo-image-picker", () => {
      const content = fs.readFileSync(
        path.resolve(__dirname, "../app/chat.tsx"),
        "utf-8"
      );
      expect(content).toContain("expo-image-picker");
      expect(content).toContain("launchImageLibraryAsync");
    });

    it("chat.tsx has emoji toggle button", () => {
      const content = fs.readFileSync(
        path.resolve(__dirname, "../app/chat.tsx"),
        "utf-8"
      );
      expect(content).toContain("toggleEmojiPicker");
      expect(content).toContain("showEmojiPicker");
      expect(content).toContain("face.smiling");
    });

    it("chat.tsx has image picker button", () => {
      const content = fs.readFileSync(
        path.resolve(__dirname, "../app/chat.tsx"),
        "utf-8"
      );
      expect(content).toContain("handlePickImage");
      expect(content).toContain("photo.on.rectangle");
    });

    it("chat.tsx handles image messages in render", () => {
      const content = fs.readFileSync(
        path.resolve(__dirname, "../app/chat.tsx"),
        "utf-8"
      );
      expect(content).toContain('messageType === "image"');
      expect(content).toContain("chatImage");
      expect(content).toContain("setPreviewImage");
    });

    it("chat.tsx has upload progress indicator", () => {
      const content = fs.readFileSync(
        path.resolve(__dirname, "../app/chat.tsx"),
        "utf-8"
      );
      expect(content).toContain("uploadingImage");
      expect(content).toContain("chatImageSending");
    });

    it("chat.tsx uses trpc uploadImage mutation", () => {
      const content = fs.readFileSync(
        path.resolve(__dirname, "../app/chat.tsx"),
        "utf-8"
      );
      expect(content).toContain("chat.uploadImage.useMutation");
    });

    it("chat.tsx has 5MB file size limit", () => {
      const content = fs.readFileSync(
        path.resolve(__dirname, "../app/chat.tsx"),
        "utf-8"
      );
      expect(content).toContain("5 * 1024 * 1024");
      expect(content).toContain("chatImageTooLarge");
    });
  });

  // --- Backend: Chat Image Upload API ---
  describe("Backend: Chat Image Upload API", () => {
    it("routers.ts has uploadImage mutation", () => {
      const content = fs.readFileSync(
        path.resolve(__dirname, "../server/routers.ts"),
        "utf-8"
      );
      expect(content).toContain("uploadImage");
      expect(content).toContain("storagePut");
      expect(content).toContain("chat-images");
    });

    it("routers.ts uploadImage accepts base64 and mimeType", () => {
      const content = fs.readFileSync(
        path.resolve(__dirname, "../server/routers.ts"),
        "utf-8"
      );
      expect(content).toContain("base64: z.string()");
      expect(content).toContain("mimeType: z.string().optional()");
    });
  });

  // --- Icon Mappings ---
  describe("Icon Mappings", () => {
    it("icon-symbol.tsx has emoji and photo icons", () => {
      const content = fs.readFileSync(
        path.resolve(__dirname, "../components/ui/icon-symbol.tsx"),
        "utf-8"
      );
      expect(content).toContain("face.smiling");
      expect(content).toContain("emoji-emotions");
      expect(content).toContain("photo.on.rectangle");
      expect(content).toContain("photo-library");
    });
  });

  // --- i18n Translations ---
  describe("i18n Translations", () => {
    it("i18n has chat image-related translations (en)", () => {
      const content = fs.readFileSync(
        path.resolve(__dirname, "../lib/i18n-context.tsx"),
        "utf-8"
      );
      expect(content).toContain("chatSendImage");
      expect(content).toContain("chatImageSending");
      expect(content).toContain("chatImageFailed");
      expect(content).toContain("chatPickImage");
      expect(content).toContain("chatImageTooLarge");
    });
  });
});
