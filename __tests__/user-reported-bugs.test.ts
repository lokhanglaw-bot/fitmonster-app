import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const ROOT = path.resolve(__dirname, "..");

describe("Bug Fix 1: Auth gate should redirect unauthenticated users", () => {
  it("AuthGate component exists and handles loading + unauthenticated states", () => {
    const authGate = fs.readFileSync(path.join(ROOT, "components/auth-gate.tsx"), "utf-8");
    // Should show loading spinner when loading
    expect(authGate).toContain("loading");
    expect(authGate).toContain("ActivityIndicator");
    // Should redirect to /auth when not authenticated
    expect(authGate).toContain('router.replace("/auth")');
    expect(authGate).toContain("isAuthenticated");
  });
});

describe("Bug Fix 2: Apple/Google account linking investigation", () => {
  it("OAuth uses openId from provider as unique identifier", () => {
    const oauth = fs.readFileSync(path.join(ROOT, "server/_core/oauth.ts"), "utf-8");
    // OAuth creates users based on openId from the provider
    expect(oauth).toContain("openId");
    expect(oauth).toContain("upsertUser");
  });
});

describe("Bug Fix 3: Monster data recovery from server", () => {
  it("ActivityProvider attempts to recover monsters from server when local data is empty", () => {
    const activity = fs.readFileSync(path.join(ROOT, "lib/activity-context.tsx"), "utf-8");
    // Should try to fetch from server when AsyncStorage is empty
    expect(activity).toContain("monsters.list");
    expect(activity).toContain("Recovered");
    expect(activity).toContain("Server monster recovery");
  });

  it("Server has monsters.list route for fetching user monsters", () => {
    const routers = fs.readFileSync(path.join(ROOT, "server/routers.ts"), "utf-8");
    expect(routers).toContain("monsters: router");
    expect(routers).toContain("list: protectedProcedure.query");
    expect(routers).toContain("getUserMonsters");
  });
});

describe("Bug Fix 4: Chat keyboard not blocking send button", () => {
  it("Chat uses KeyboardAvoidingView with correct iOS offset", () => {
    const chat = fs.readFileSync(path.join(ROOT, "app/chat.tsx"), "utf-8");
    // Should use KeyboardAvoidingView with padding behavior
    expect(chat).toContain("KeyboardAvoidingView");
    expect(chat).toContain('behavior="padding"');
    // iOS offset should use insets.top
    expect(chat).toContain("insets.top");
    // Input bar should use insets.bottom for proper spacing
    expect(chat).toContain("Math.max(insets.bottom, 8)");
  });
});

describe("Bug Fix 5: Delete account error fixed", () => {
  it("Edit profile delete account uses correct tRPC batch format", () => {
    const editProfile = fs.readFileSync(path.join(ROOT, "app/edit-profile.tsx"), "utf-8");
    // Should use batch=1 query param
    expect(editProfile).toContain("auth.deleteAccount?batch=1");
    // Should send proper tRPC batch body
    expect(editProfile).toContain('"json":null');
  });

  it("Edit profile delete account includes fallback auth headers for local users", () => {
    const editProfile = fs.readFileSync(path.join(ROOT, "app/edit-profile.tsx"), "utf-8");
    // Should include X-User-Id and X-Open-Id for local login users
    expect(editProfile).toContain("X-User-Id");
    expect(editProfile).toContain("X-Open-Id");
    expect(editProfile).toContain("@fitmonster_local_auth");
  });

  it("Home page delete account uses tRPC mutation (auto-handles auth)", () => {
    const index = fs.readFileSync(path.join(ROOT, "app/(tabs)/index.tsx"), "utf-8");
    expect(index).toContain("trpc.auth.deleteAccount.useMutation");
    expect(index).toContain("deleteAccountMutation.mutateAsync");
  });

  it("tRPC client sends proper auth headers for local users", () => {
    const trpcClient = fs.readFileSync(path.join(ROOT, "lib/trpc.ts"), "utf-8");
    expect(trpcClient).toContain("X-User-Id");
    expect(trpcClient).toContain("X-Open-Id");
    expect(trpcClient).toContain("@fitmonster_local_auth");
  });
});
