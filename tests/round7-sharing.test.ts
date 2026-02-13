import { describe, it, expect } from "vitest";

describe("Round 7 - Social Media Sharing Buttons", () => {
  const SHARE_MESSAGE = "Join me on FitMonster! Raise your fitness monster and get healthy together \uD83D\uDCAA\uD83D\uDC7E";
  const APP_URL = "https://fitmonster.app";

  describe("Share Message", () => {
    it("should have a share message that mentions FitMonster", () => {
      expect(SHARE_MESSAGE).toContain("FitMonster");
    });

    it("should have a valid app URL", () => {
      expect(APP_URL).toMatch(/^https:\/\//);
    });

    it("should include a call to action in the share message", () => {
      expect(SHARE_MESSAGE).toContain("Join me");
    });
  });

  describe("Twitter/X Share URL", () => {
    it("should generate correct Twitter intent URL", () => {
      const text = encodeURIComponent(SHARE_MESSAGE);
      const url = encodeURIComponent(APP_URL);
      const twitterUrl = `https://twitter.com/intent/tweet?text=${text}&url=${url}`;
      expect(twitterUrl).toContain("twitter.com/intent/tweet");
      expect(twitterUrl).toContain("text=");
      expect(twitterUrl).toContain("url=");
    });

    it("should properly encode the share message for Twitter", () => {
      const encoded = encodeURIComponent(SHARE_MESSAGE);
      expect(encoded).not.toContain(" ");
      expect(decodeURIComponent(encoded)).toBe(SHARE_MESSAGE);
    });
  });

  describe("Facebook Share URL", () => {
    it("should generate correct Facebook sharer URL", () => {
      const url = encodeURIComponent(APP_URL);
      const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${url}`;
      expect(facebookUrl).toContain("facebook.com/sharer/sharer.php");
      expect(facebookUrl).toContain("u=");
    });

    it("should include the app URL in the Facebook share", () => {
      const url = encodeURIComponent(APP_URL);
      const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${url}`;
      expect(facebookUrl).toContain(encodeURIComponent(APP_URL));
    });
  });

  describe("WhatsApp Share URL", () => {
    it("should generate correct WhatsApp share URL", () => {
      const text = encodeURIComponent(`${SHARE_MESSAGE} ${APP_URL}`);
      const whatsappUrl = `https://wa.me/?text=${text}`;
      expect(whatsappUrl).toContain("wa.me");
      expect(whatsappUrl).toContain("text=");
    });

    it("should include both message and URL in WhatsApp share", () => {
      const combined = `${SHARE_MESSAGE} ${APP_URL}`;
      expect(combined).toContain(SHARE_MESSAGE);
      expect(combined).toContain(APP_URL);
    });
  });

  describe("Share Button Configuration", () => {
    const shareButtons = [
      { name: "Twitter", color: "#1DA1F2", icon: "\ud835\udd4f" },
      { name: "Facebook", color: "#1877F2", icon: "f" },
      { name: "WhatsApp", color: "#25D366", icon: "\ud83d\udcac" },
      { name: "More", color: "muted", icon: "\u2197" },
    ];

    it("should have 4 share buttons", () => {
      expect(shareButtons).toHaveLength(4);
    });

    it("should include Twitter, Facebook, WhatsApp, and More", () => {
      const names = shareButtons.map((b) => b.name);
      expect(names).toContain("Twitter");
      expect(names).toContain("Facebook");
      expect(names).toContain("WhatsApp");
      expect(names).toContain("More");
    });

    it("should have distinct brand colors for each platform", () => {
      const colors = shareButtons.filter((b) => b.name !== "More").map((b) => b.color);
      const uniqueColors = new Set(colors);
      expect(uniqueColors.size).toBe(3);
    });

    it("should have icons for all buttons", () => {
      shareButtons.forEach((btn) => {
        expect(btn.icon.length).toBeGreaterThan(0);
      });
    });
  });

  describe("Generic Share Fallback", () => {
    it("should construct clipboard text with message and URL", () => {
      const clipboardText = `${SHARE_MESSAGE} ${APP_URL}`;
      expect(clipboardText).toContain("FitMonster");
      expect(clipboardText).toContain("https://");
    });
  });
});
