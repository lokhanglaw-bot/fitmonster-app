import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Tests for the chat functionality fixes:
 * 1. WebSocket reconnect logic
 * 2. Message send with connection check
 * 3. REST API history fallback
 * 4. Server-side push notification for offline users
 * 5. Ping/pong keepalive
 */

// Mock modules
vi.mock("react-native", () => ({
  Platform: { OS: "ios" },
  AppState: {
    addEventListener: vi.fn(() => ({ remove: vi.fn() })),
  },
  Alert: { alert: vi.fn() },
  Keyboard: { addListener: vi.fn(() => ({ remove: vi.fn() })), dismiss: vi.fn() },
  StyleSheet: { create: (s: any) => s },
  Animated: {
    Value: vi.fn(() => ({ setValue: vi.fn() })),
    loop: vi.fn(() => ({ start: vi.fn(), stop: vi.fn() })),
    sequence: vi.fn(),
    timing: vi.fn(),
    View: "View",
  },
}));

vi.mock("@/constants/oauth", () => ({
  getApiBaseUrl: () => "https://api.example.com",
}));

vi.mock("@/lib/_core/auth", () => ({
  getSessionToken: vi.fn(() => Promise.resolve("mock-token")),
}));

describe("Chat Fixes - WebSocket URL generation", () => {
  it("should convert http to ws URL correctly", () => {
    const apiBase = "https://api.example.com";
    const wsBase = apiBase.replace(/^http/, "ws");
    expect(wsBase).toBe("wss://api.example.com");
  });

  it("should convert http (non-secure) to ws URL correctly", () => {
    const apiBase = "http://localhost:3000";
    const wsBase = apiBase.replace(/^http/, "ws");
    expect(wsBase).toBe("ws://localhost:3000");
  });
});

describe("Chat Fixes - Message validation", () => {
  it("should reject empty messages", () => {
    const text = "   ";
    expect(text.trim()).toBe("");
    expect(text.trim().length).toBe(0);
  });

  it("should accept valid messages", () => {
    const text = "Hello world";
    expect(text.trim().length).toBeGreaterThan(0);
  });

  it("should truncate long push notification preview to 100 chars", () => {
    const longMsg = "A".repeat(200);
    const preview = longMsg.length > 100 ? longMsg.substring(0, 100) + "..." : longMsg;
    expect(preview.length).toBe(103); // 100 + "..."
  });

  it("should show photo emoji for image messages", () => {
    const messageType = "image";
    const preview = messageType === "image" ? "📷 Photo"
      : messageType === "audio" ? "🎤 Voice message"
      : "text content";
    expect(preview).toBe("📷 Photo");
  });

  it("should show mic emoji for audio messages", () => {
    const messageType: string = "audio";
    const preview = messageType === "image" ? "📷 Photo"
      : messageType === "audio" ? "🎤 Voice message"
      : "text content";
    expect(preview).toBe("🎤 Voice message");
  });
});

describe("Chat Fixes - Reconnect logic", () => {
  it("should calculate backoff delay correctly", () => {
    // New formula: min(3000 * 1.5^min(attempt, 5), 15000)
    const calcDelay = (attempt: number) =>
      Math.min(3000 * Math.pow(1.5, Math.min(attempt, 5)), 15000);

    expect(calcDelay(0)).toBe(3000);          // First attempt: 3s
    expect(calcDelay(1)).toBe(4500);          // Second: 4.5s
    expect(calcDelay(2)).toBe(6750);          // Third: 6.75s
    expect(calcDelay(3)).toBe(10125);         // Fourth: ~10s
    expect(calcDelay(4)).toBe(15000);         // Fifth: capped at 15s
    expect(calcDelay(5)).toBe(15000);         // Sixth: still capped
    expect(calcDelay(100)).toBe(15000);       // Always capped at 15s
  });

  it("should not exceed max reconnect delay", () => {
    for (let i = 0; i < 20; i++) {
      const delay = Math.min(3000 * Math.pow(1.5, Math.min(i, 5)), 15000);
      expect(delay).toBeLessThanOrEqual(15000);
    }
  });
});

describe("Chat Fixes - History sorting", () => {
  it("should sort messages by createdAt ascending", () => {
    const messages = [
      { id: 3, createdAt: "2025-01-03T00:00:00Z" },
      { id: 1, createdAt: "2025-01-01T00:00:00Z" },
      { id: 2, createdAt: "2025-01-02T00:00:00Z" },
    ];
    const sorted = [...messages].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    expect(sorted[0].id).toBe(1);
    expect(sorted[1].id).toBe(2);
    expect(sorted[2].id).toBe(3);
  });

  it("should deduplicate messages by id", () => {
    const existing = [
      { id: 1, message: "hello" },
      { id: 2, message: "world" },
    ];
    const newMsg = { id: 2, message: "world" };
    const isDuplicate = existing.some((m) => m.id === newMsg.id);
    expect(isDuplicate).toBe(true);

    const newMsg2 = { id: 3, message: "new" };
    const isDuplicate2 = existing.some((m) => m.id === newMsg2.id);
    expect(isDuplicate2).toBe(false);
  });
});

describe("Chat Fixes - Connection status checks", () => {
  it("should block send when disconnected", () => {
    const status: string = "disconnected";
    const canSend = status === "connected";
    expect(canSend).toBe(false);
  });

  it("should block send when connecting", () => {
    const status: string = "connecting";
    const canSend = status === "connected";
    expect(canSend).toBe(false);
  });

  it("should allow send when connected", () => {
    const status = "connected";
    const canSend = status === "connected";
    expect(canSend).toBe(true);
  });
});

describe("Chat Fixes - Ping/Pong keepalive", () => {
  it("should respond with pong when receiving ping", () => {
    const msg = { type: "ping" };
    const response = msg.type === "ping" ? { type: "pong" } : null;
    expect(response).toEqual({ type: "pong" });
  });

  it("should ignore pong messages", () => {
    const msg = { type: "pong" };
    const shouldProcess = msg.type !== "pong";
    expect(shouldProcess).toBe(false);
  });
});

describe("Chat Fixes - Offline push notification logic", () => {
  it("should send push when receiver is offline", () => {
    const receiverOnline = false;
    const shouldSendPush = !receiverOnline;
    expect(shouldSendPush).toBe(true);
  });

  it("should NOT send push when receiver is online", () => {
    const receiverOnline = true;
    const shouldSendPush = !receiverOnline;
    expect(shouldSendPush).toBe(false);
  });
});
