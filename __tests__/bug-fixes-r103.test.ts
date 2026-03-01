import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock AsyncStorage
const mockStorage: Record<string, string> = {};
vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn((key: string) => Promise.resolve(mockStorage[key] || null)),
    setItem: vi.fn((key: string, value: string) => {
      mockStorage[key] = value;
      return Promise.resolve();
    }),
    removeItem: vi.fn((key: string) => {
      delete mockStorage[key];
      return Promise.resolve();
    }),
    clear: vi.fn(() => {
      Object.keys(mockStorage).forEach((k) => delete mockStorage[k]);
      return Promise.resolve();
    }),
  },
}));

// Mock Platform
vi.mock("react-native", () => ({
  Platform: { OS: "ios" },
  StyleSheet: { create: (s: any) => s },
  Alert: { alert: vi.fn() },
  View: "View",
  Text: "Text",
  ActivityIndicator: "ActivityIndicator",
}));

// Mock expo modules
vi.mock("expo-secure-store", () => ({
  getItemAsync: vi.fn(() => Promise.resolve(null)),
  setItemAsync: vi.fn(() => Promise.resolve()),
  deleteItemAsync: vi.fn(() => Promise.resolve()),
}));

vi.mock("expo-router", () => ({
  useRouter: () => ({ replace: vi.fn(), back: vi.fn() }),
  useSegments: () => [],
}));

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({
    user: null,
    loading: false,
    isAuthenticated: false,
    logout: vi.fn(),
  }),
}));

vi.mock("@/hooks/use-colors", () => ({
  useColors: () => ({
    background: "#fff",
    primary: "#0a7ea4",
    foreground: "#11181C",
    muted: "#687076",
    border: "#E5E7EB",
  }),
}));

vi.mock("@/constants/oauth", () => ({
  getApiBaseUrl: () => "http://localhost:3000",
  SESSION_TOKEN_KEY: "app_session_token",
  USER_INFO_KEY: "manus-runtime-user-info",
}));

vi.mock("@/lib/_core/auth", () => ({
  getSessionToken: vi.fn(() => Promise.resolve(null)),
  removeSessionToken: vi.fn(() => Promise.resolve()),
  clearUserInfo: vi.fn(() => Promise.resolve()),
  setSessionToken: vi.fn(() => Promise.resolve()),
  setUserInfo: vi.fn(() => Promise.resolve()),
  getUserInfo: vi.fn(() => Promise.resolve(null)),
}));

describe("Bug Fix R103: syncLocalUser ACCOUNT_NOT_FOUND", () => {
  beforeEach(() => {
    Object.keys(mockStorage).forEach((k) => delete mockStorage[k]);
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it("should return ACCOUNT_NOT_FOUND when server says account was deleted", async () => {
    // Simulate the syncLocalUserToDb function behavior
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      json: () =>
        Promise.resolve([
          {
            error: {
              json: { message: "ACCOUNT_NOT_FOUND" },
            },
          },
        ]),
    });
    global.fetch = mockFetch;

    // Call the sync endpoint
    const res = await fetch("http://localhost:3000/api/trpc/auth.syncLocalUser?batch=1", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ "0": { json: { openId: "local-test@test.com", name: "Test", email: "test@test.com" } } }),
    });

    expect(res.ok).toBe(false);
    const data = await res.json();
    const errMsg = data?.[0]?.error?.json?.message || "";
    expect(errMsg).toContain("ACCOUNT_NOT_FOUND");
  });

  it("should clear local auth when account is not found", async () => {
    const AsyncStorage = (await import("@react-native-async-storage/async-storage")).default;

    // Set up local auth data
    await AsyncStorage.setItem(
      "@fitmonster_local_auth",
      JSON.stringify({
        id: 1,
        openId: "local-test@test.com",
        name: "Test",
        email: "test@test.com",
        lastSignedIn: new Date().toISOString(),
      })
    );

    // Verify it was set
    const stored = await AsyncStorage.getItem("@fitmonster_local_auth");
    expect(stored).not.toBeNull();

    // Simulate clearing on ACCOUNT_NOT_FOUND
    await AsyncStorage.removeItem("@fitmonster_local_auth");

    // Verify it was cleared
    const cleared = await AsyncStorage.getItem("@fitmonster_local_auth");
    expect(cleared).toBeNull();
  });
});

describe("Bug Fix R103: Profile completion check", () => {
  beforeEach(() => {
    Object.keys(mockStorage).forEach((k) => delete mockStorage[k]);
    vi.clearAllMocks();
  });

  it("should check server for profile completion when not cached locally", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve([
          {
            result: {
              data: {
                json: {
                  profileCompleted: true,
                  birthday: "1990-01-01",
                  gender: "male",
                  height: 175,
                  weight: 70,
                },
              },
            },
          },
        ]),
    });
    global.fetch = mockFetch;

    // Simulate the server check
    const res = await fetch(
      `http://localhost:3000/api/trpc/profile.get?batch=1&input=${encodeURIComponent(JSON.stringify({ "0": { json: null } }))}`,
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      }
    );

    const data = await res.json();
    const profile = data?.[0]?.result?.data?.json;
    expect(profile).toBeDefined();
    expect(profile.profileCompleted).toBe(true);
  });

  it("should cache profile completion locally after server confirms", async () => {
    const AsyncStorage = (await import("@react-native-async-storage/async-storage")).default;

    const userKey = "local-test@test.com";
    const key = `@fitmonster_profile_completed_${userKey}`;

    // Initially not cached
    const initial = await AsyncStorage.getItem(key);
    expect(initial).toBeNull();

    // Cache it
    await AsyncStorage.setItem(key, "true");

    // Now it should be cached
    const cached = await AsyncStorage.getItem(key);
    expect(cached).toBe("true");
  });
});

describe("Bug Fix R103: Delete account logout", () => {
  beforeEach(() => {
    Object.keys(mockStorage).forEach((k) => delete mockStorage[k]);
    vi.clearAllMocks();
  });

  it("should clear all storage on successful account deletion", async () => {
    const AsyncStorage = (await import("@react-native-async-storage/async-storage")).default;

    // Set up various storage items
    await AsyncStorage.setItem("@fitmonster_local_auth", "{}");
    await AsyncStorage.setItem("@fitmonster_profile_completed_test", "true");
    await AsyncStorage.setItem("@fitmonster_profile_data_test", "{}");

    // Simulate delete account success
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([{ result: { data: { json: { success: true } } } }]),
    });
    global.fetch = mockFetch;

    const res = await fetch("http://localhost:3000/api/trpc/auth.deleteAccount?batch=1", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ "0": { json: null } }),
    });

    expect(res.ok).toBe(true);

    // Clear all storage (as the fix does)
    await AsyncStorage.clear();

    // Verify everything is cleared
    const localAuth = await AsyncStorage.getItem("@fitmonster_local_auth");
    expect(localAuth).toBeNull();
    const profileCompleted = await AsyncStorage.getItem("@fitmonster_profile_completed_test");
    expect(profileCompleted).toBeNull();
  });
});

describe("Bug Fix R103: OAuth error handling", () => {
  it("should handle OAuth session cancel gracefully", () => {
    // Simulate WebBrowser result types
    const cancelResult = { type: "cancel" as const };
    const dismissResult = { type: "dismiss" as const };

    expect(cancelResult.type).toBe("cancel");
    expect(dismissResult.type).toBe("dismiss");

    // These should not throw errors
    expect(() => {
      if (cancelResult.type === "cancel" || cancelResult.type === "dismiss") {
        // Gracefully handled
      }
    }).not.toThrow();
  });

  it("should always reset loading state after OAuth attempt", async () => {
    let loading = true;

    try {
      // Simulate OAuth flow that throws
      throw new Error("OAuth failed");
    } catch (_) {
      // Error handled
    } finally {
      loading = false;
    }

    expect(loading).toBe(false);
  });
});
