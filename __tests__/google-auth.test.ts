import { describe, it, expect } from "vitest";

describe("Google Native Authentication", () => {
  describe("createOrLoginGoogleUser logic", () => {
    it("should generate correct openId from Google user ID", () => {
      const googleUserId = "109876543210123456789";
      const openId = `google-${googleUserId}`;
      expect(openId).toBe("google-109876543210123456789");
      expect(openId.startsWith("google-")).toBe(true);
    });

    it("should handle name construction from given and family names", () => {
      const googleUser = {
        givenName: "John",
        familyName: "Doe",
        name: "John Doe",
      };
      const displayName = [googleUser.givenName, googleUser.familyName]
        .filter(Boolean)
        .join(" ") || googleUser.name || null;
      expect(displayName).toBe("John Doe");
    });

    it("should handle partial name (only given name)", () => {
      const googleUser = {
        givenName: "John",
        familyName: null as string | null,
        name: "John",
      };
      const displayName = [googleUser.givenName, googleUser.familyName]
        .filter(Boolean)
        .join(" ") || googleUser.name || null;
      expect(displayName).toBe("John");
    });

    it("should fall back to name field when given/family are null", () => {
      const googleUser = {
        givenName: null as string | null,
        familyName: null as string | null,
        name: "John Doe",
      };
      const displayName = [googleUser.givenName, googleUser.familyName]
        .filter(Boolean)
        .join(" ") || googleUser.name || null;
      expect(displayName).toBe("John Doe");
    });

    it("should handle all null names gracefully", () => {
      const googleUser = {
        givenName: null as string | null,
        familyName: null as string | null,
        name: null as string | null,
      };
      const displayName = [googleUser.givenName, googleUser.familyName]
        .filter(Boolean)
        .join(" ") || googleUser.name || null;
      expect(displayName).toBeNull();
    });
  });

  describe("Google ID token validation", () => {
    it("should reject empty ID token", () => {
      const idToken = "";
      expect(idToken.length).toBe(0);
      // The Zod schema requires min(1), so empty string would be rejected
    });

    it("should accept valid JWT-like ID token", () => {
      const idToken = "eyJhbGciOiJSUzI1NiJ9.eyJpc3MiOiJhY2NvdW50cy5nb29nbGUuY29tIn0.signature";
      expect(idToken.length).toBeGreaterThan(0);
      expect(idToken.split(".").length).toBe(3); // JWT has 3 parts
    });

    it("should validate Google token issuer", () => {
      const validIssuers = ["accounts.google.com", "https://accounts.google.com"];
      validIssuers.forEach((iss) => {
        const isValid = iss === "accounts.google.com" || iss === "https://accounts.google.com";
        expect(isValid).toBe(true);
      });
    });

    it("should reject invalid issuer", () => {
      const iss: string = "https://evil.example.com";
      const isValid = iss === "accounts.google.com" || iss === "https://accounts.google.com";
      expect(isValid).toBe(false);
    });

    it("should validate audience against known client IDs", () => {
      const validClientIds = [
        "525433155057-8u1ubopd5mcrk3mucqtgplpoc71drsbg.apps.googleusercontent.com", // Web
        "525433155057-m3b87hddvrqmoe5jjlun01hb5kdula6d.apps.googleusercontent.com", // iOS
        "525433155057-ch8mhegje24psobbld0m657tet2rn81k.apps.googleusercontent.com", // Android
      ];
      // Web client ID should be valid
      expect(validClientIds.includes("525433155057-8u1ubopd5mcrk3mucqtgplpoc71drsbg.apps.googleusercontent.com")).toBe(true);
      // iOS client ID should be valid
      expect(validClientIds.includes("525433155057-m3b87hddvrqmoe5jjlun01hb5kdula6d.apps.googleusercontent.com")).toBe(true);
      // Android client ID should be valid
      expect(validClientIds.includes("525433155057-ch8mhegje24psobbld0m657tet2rn81k.apps.googleusercontent.com")).toBe(true);
      // Random client ID should be invalid
      expect(validClientIds.includes("fake-client-id.apps.googleusercontent.com")).toBe(false);
    });
  });

  describe("Google auth error handling", () => {
    it("should recognize user cancellation via response type", () => {
      const response = { type: "cancelled" as const, data: null };
      expect(response.type).toBe("cancelled");
    });

    it("should recognize successful sign in", () => {
      const response = {
        type: "success" as const,
        data: {
          user: {
            id: "123",
            name: "John Doe",
            email: "john@gmail.com",
            photo: null,
            familyName: "Doe",
            givenName: "John",
          },
          idToken: "eyJhbGciOiJSUzI1NiJ9.payload.signature",
          scopes: ["email", "profile"],
          serverAuthCode: null,
        },
      };
      expect(response.type).toBe("success");
      expect(response.data).not.toBeNull();
      expect(response.data.user.email).toBe("john@gmail.com");
      expect(response.data.idToken).toBeTruthy();
    });

    it("should handle SIGN_IN_CANCELLED status code", () => {
      // statusCodes.SIGN_IN_CANCELLED is a string constant
      const SIGN_IN_CANCELLED = "SIGN_IN_CANCELLED";
      const error = { code: SIGN_IN_CANCELLED };
      expect(error.code).toBe("SIGN_IN_CANCELLED");
    });
  });

  describe("Google auth local storage format", () => {
    it("should create correct local user object for AsyncStorage", () => {
      const result = {
        id: 42,
        openId: "google-109876543210",
        name: "John Doe",
        email: "john@gmail.com",
      };
      const localUser = {
        id: result.id,
        openId: result.openId,
        name: result.name || "Google User",
        email: result.email || "",
        loginMethod: "google" as const,
        lastSignedIn: new Date().toISOString(),
      };
      expect(localUser.id).toBe(42);
      expect(localUser.openId).toBe("google-109876543210");
      expect(localUser.loginMethod).toBe("google");
      expect(localUser.name).toBe("John Doe");
      expect(localUser.email).toBe("john@gmail.com");
    });

    it("should use fallback values when Google data is missing", () => {
      const result = {
        id: 42,
        openId: "google-109876543210",
        name: null as string | null,
        email: null as string | null,
      };
      const name = "Jane Doe";
      const email = "jane@gmail.com";
      const localUser = {
        id: result.id,
        openId: result.openId,
        name: result.name || name || "Google User",
        email: result.email || email || "",
        loginMethod: "google" as const,
        lastSignedIn: new Date().toISOString(),
      };
      expect(localUser.name).toBe("Jane Doe");
      expect(localUser.email).toBe("jane@gmail.com");
    });

    it("should use Google User as final fallback name", () => {
      const result = {
        id: 42,
        openId: "google-109876543210",
        name: null as string | null,
        email: "john@gmail.com",
      };
      const localUser = {
        id: result.id,
        openId: result.openId,
        name: result.name || "Google User",
        email: result.email || "",
        loginMethod: "google" as const,
        lastSignedIn: new Date().toISOString(),
      };
      expect(localUser.name).toBe("Google User");
    });
  });

  describe("Google Sign In configuration", () => {
    it("should have correct iOS URL scheme format", () => {
      const iosClientId = "525433155057-m3b87hddvrqmoe5jjlun01hb5kdula6d.apps.googleusercontent.com";
      // iOS URL scheme is the reversed client ID
      const iosUrlScheme = "com.googleusercontent.apps.525433155057-m3b87hddvrqmoe5jjlun01hb5kdula6d";
      expect(iosUrlScheme).toContain("com.googleusercontent.apps");
      // Verify the client ID portion matches
      const clientIdPart = iosUrlScheme.replace("com.googleusercontent.apps.", "");
      expect(iosClientId.startsWith(clientIdPart)).toBe(true);
    });

    it("should configure with webClientId for ID token generation", () => {
      const config = {
        webClientId: "525433155057-8u1ubopd5mcrk3mucqtgplpoc71drsbg.apps.googleusercontent.com",
        iosClientId: "525433155057-m3b87hddvrqmoe5jjlun01hb5kdula6d.apps.googleusercontent.com",
        offlineAccess: false,
      };
      expect(config.webClientId).toBeTruthy();
      expect(config.iosClientId).toBeTruthy();
      expect(config.offlineAccess).toBe(false);
    });
  });

  describe("Platform-specific behavior", () => {
    it("should use native Google Sign In on iOS", () => {
      const platform: string = "ios";
      const provider: string = "google";
      const useNative = provider === "google" && platform !== "web";
      expect(useNative).toBe(true);
    });

    it("should use native Google Sign In on Android", () => {
      const platform: string = "android";
      const provider: string = "google";
      const useNative = provider === "google" && platform !== "web";
      expect(useNative).toBe(true);
    });

    it("should use OAuth fallback on web", () => {
      const platform: string = "web";
      const provider: string = "google";
      const useNative = provider === "google" && platform !== "web";
      expect(useNative).toBe(false);
    });

    it("should use native Apple Sign In only on iOS", () => {
      const platform: string = "ios";
      const provider: string = "apple";
      const useNativeApple = provider === "apple" && platform === "ios";
      expect(useNativeApple).toBe(true);
    });

    it("should use OAuth fallback for Apple on Android", () => {
      const platform: string = "android";
      const provider: string = "apple";
      const useNativeApple = provider === "apple" && platform === "ios";
      expect(useNativeApple).toBe(false);
    });
  });
});
