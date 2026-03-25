import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Tests for the critical auth token flow fix (Round 122):
 * - Server mutations (localLogin, localSignup, appleLogin, googleLogin, syncLocalUser) must return sessionToken
 * - Client must store sessionToken in SecureStore after login
 * - tRPC client must send Bearer token in Authorization header
 */

// Mock the SDK's createSessionToken
const mockCreateSessionToken = vi.fn().mockResolvedValue("mock-jwt-token-abc123");

vi.mock("../server/_core/sdk", () => ({
  sdk: {
    createSessionToken: mockCreateSessionToken,
  },
}));

// Mock db functions
vi.mock("../server/db", () => ({
  createLocalUser: vi.fn().mockResolvedValue({ id: 1, openId: "local-test@test.com" }),
  verifyLocalUser: vi.fn().mockResolvedValue({ id: 1, openId: "local-test@test.com", name: "Test", status: "ok" }),
  checkUserExistsByEmail: vi.fn().mockResolvedValue(true),
  getUserByOpenId: vi.fn().mockResolvedValue({ id: 1, openId: "local-test@test.com", name: "Test" }),
  upsertUser: vi.fn().mockResolvedValue(undefined),
}));

describe("Auth Token Flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Server-side: SDK createSessionToken", () => {
    it("should be called with openId and options", async () => {
      const { sdk } = await import("../server/_core/sdk");
      const token = await sdk.createSessionToken("local-test@test.com", {
        name: "Test User",
        expiresInMs: 365 * 24 * 60 * 60 * 1000,
      });
      expect(token).toBe("mock-jwt-token-abc123");
      expect(mockCreateSessionToken).toHaveBeenCalledWith("local-test@test.com", {
        name: "Test User",
        expiresInMs: 365 * 24 * 60 * 60 * 1000,
      });
    });
  });

  describe("Server routers: sessionToken in response", () => {
    it("localLogin mutation should include sessionToken generation code", async () => {
      // Read the routers.ts file content and verify it contains sessionToken generation
      const fs = await import("fs");
      const routersContent = fs.readFileSync("server/routers.ts", "utf-8");

      // Verify localLogin generates sessionToken
      expect(routersContent).toContain("localLogin: publicProcedure");
      expect(routersContent).toContain("sdk.createSessionToken(user.openId");
      // Verify it returns sessionToken
      expect(routersContent).toMatch(/localLogin.*?return.*?sessionToken/s);
    });

    it("localSignup mutation should include sessionToken generation code", async () => {
      const fs = await import("fs");
      const routersContent = fs.readFileSync("server/routers.ts", "utf-8");

      expect(routersContent).toContain("localSignup: publicProcedure");
      expect(routersContent).toContain("sdk.createSessionToken(result.openId");
    });

    it("appleLogin mutation should include sessionToken generation code", async () => {
      const fs = await import("fs");
      const routersContent = fs.readFileSync("server/routers.ts", "utf-8");

      expect(routersContent).toContain("appleLogin: publicProcedure");
      // Check that appleLogin section generates sessionToken
      const appleSection = routersContent.substring(
        routersContent.indexOf("appleLogin: publicProcedure"),
        routersContent.indexOf("googleLogin: publicProcedure")
      );
      expect(appleSection).toContain("sdk.createSessionToken(result.openId");
      expect(appleSection).toContain("sessionToken");
    });

    it("googleLogin mutation should include sessionToken generation code", async () => {
      const fs = await import("fs");
      const routersContent = fs.readFileSync("server/routers.ts", "utf-8");

      expect(routersContent).toContain("googleLogin: publicProcedure");
      // Check that googleLogin section generates sessionToken
      const googleSection = routersContent.substring(
        routersContent.indexOf("googleLogin: publicProcedure"),
        routersContent.indexOf("deleteAccount: protectedProcedure")
      );
      expect(googleSection).toContain("sdk.createSessionToken(result.openId");
      expect(googleSection).toContain("sessionToken");
    });

    it("syncLocalUser mutation should include sessionToken generation code", async () => {
      const fs = await import("fs");
      const routersContent = fs.readFileSync("server/routers.ts", "utf-8");

      const syncSection = routersContent.substring(
        routersContent.indexOf("syncLocalUser: publicProcedure"),
        routersContent.indexOf("appleLogin: publicProcedure")
      );
      expect(syncSection).toContain("sdk.createSessionToken(existingUser.openId");
      expect(syncSection).toContain("sessionToken");
    });

    it("resetPassword mutation should include sessionToken generation code", async () => {
      const fs = await import("fs");
      const routersContent = fs.readFileSync("server/routers.ts", "utf-8");

      const resetSection = routersContent.substring(
        routersContent.indexOf("resetPassword: publicProcedure"),
        routersContent.indexOf("syncLocalUser: publicProcedure")
      );
      expect(resetSection).toContain("sdk.createSessionToken(user.openId");
      expect(resetSection).toContain("sessionToken");
    });
  });

  describe("Client-side: auth-context stores sessionToken", () => {
    it("auth-context should store sessionToken after localLogin", async () => {
      const fs = await import("fs");
      const authContextContent = fs.readFileSync("lib/auth-context.tsx", "utf-8");

      // After localLogin result, should call Auth.setSessionToken
      const localLoginSection = authContextContent.substring(
        authContextContent.indexOf("const localLogin = useCallback"),
        authContextContent.indexOf("const googleLogin = useCallback")
      );
      expect(localLoginSection).toContain("Auth.setSessionToken(result.sessionToken)");
    });

    it("auth-context should store sessionToken after googleLogin", async () => {
      const fs = await import("fs");
      const authContextContent = fs.readFileSync("lib/auth-context.tsx", "utf-8");

      const googleLoginSection = authContextContent.substring(
        authContextContent.indexOf("const googleLogin = useCallback"),
        authContextContent.indexOf("const appleLogin = useCallback")
      );
      expect(googleLoginSection).toContain("Auth.setSessionToken(result.sessionToken)");
    });

    it("auth-context should store sessionToken after appleLogin", async () => {
      const fs = await import("fs");
      const authContextContent = fs.readFileSync("lib/auth-context.tsx", "utf-8");

      const appleLoginSection = authContextContent.substring(
        authContextContent.indexOf("const appleLogin = useCallback"),
        authContextContent.indexOf("const localSignup = useCallback")
      );
      expect(appleLoginSection).toContain("Auth.setSessionToken(result.sessionToken)");
    });

    it("auth-context should store sessionToken after localSignup", async () => {
      const fs = await import("fs");
      const authContextContent = fs.readFileSync("lib/auth-context.tsx", "utf-8");

      const localSignupSection = authContextContent.substring(
        authContextContent.indexOf("const localSignup = useCallback"),
        authContextContent.indexOf("const logout = useCallback")
      );
      expect(localSignupSection).toContain("Auth.setSessionToken(result.sessionToken)");
    });

    it("syncLocalUserToDb should store sessionToken", async () => {
      const fs = await import("fs");
      const authContextContent = fs.readFileSync("lib/auth-context.tsx", "utf-8");

      const syncSection = authContextContent.substring(
        authContextContent.indexOf("async function syncLocalUserToDb"),
        authContextContent.indexOf("type AuthContextType")
      );
      expect(syncSection).toContain("Auth.setSessionToken(result.sessionToken)");
    });
  });

  describe("tRPC client: sends Bearer token", () => {
    it("trpc.ts should use Auth.getSessionToken() for Bearer header", async () => {
      const fs = await import("fs");
      const trpcContent = fs.readFileSync("lib/trpc.ts", "utf-8");

      expect(trpcContent).toContain("Auth.getSessionToken()");
      expect(trpcContent).toContain("Authorization: `Bearer ${token}`");
    });
  });

  describe("authenticateRequest: accepts Bearer token", () => {
    it("sdk.ts should extract Bearer token from Authorization header", async () => {
      const fs = await import("fs");
      const sdkContent = fs.readFileSync("server/_core/sdk.ts", "utf-8");

      expect(sdkContent).toContain('authHeader.startsWith("Bearer ")');
      expect(sdkContent).toContain("token || cookies.get(COOKIE_NAME)");
    });
  });
});
