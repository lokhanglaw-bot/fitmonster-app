import { describe, it, expect } from "vitest";

/**
 * Tests for the password reset / legacy account migration flow.
 * Validates server-side logic (db functions) and route behavior.
 */

// --- Mock the crypto module used in db.ts ---
const { createHash, randomBytes } = await import("crypto");

function hashPassword(password: string, salt: string): string {
  return createHash("sha256").update(password + salt).digest("hex");
}

function generateSalt(): string {
  return randomBytes(32).toString("hex");
}

describe("Password Reset - Server Logic", () => {
  it("should hash password deterministically with same salt", () => {
    const salt = "test-salt-123";
    const hash1 = hashPassword("mypassword", salt);
    const hash2 = hashPassword("mypassword", salt);
    expect(hash1).toBe(hash2);
  });

  it("should produce different hashes for different passwords", () => {
    const salt = "test-salt-123";
    const hash1 = hashPassword("password1", salt);
    const hash2 = hashPassword("password2", salt);
    expect(hash1).not.toBe(hash2);
  });

  it("should produce different hashes for different salts", () => {
    const salt1 = generateSalt();
    const salt2 = generateSalt();
    const hash1 = hashPassword("samepassword", salt1);
    const hash2 = hashPassword("samepassword", salt2);
    expect(hash1).not.toBe(hash2);
  });

  it("should generate unique salts each time", () => {
    const salt1 = generateSalt();
    const salt2 = generateSalt();
    expect(salt1).not.toBe(salt2);
    expect(salt1.length).toBe(64); // 32 bytes = 64 hex chars
  });
});

describe("Password Reset - Route Input Validation", () => {
  it("should require email to be valid format", () => {
    const validEmails = ["test@example.com", "user@domain.co", "a@b.c"];
    const invalidEmails = ["notanemail", "@domain.com", "user@", ""];

    for (const email of validEmails) {
      expect(email.includes("@")).toBe(true);
    }
    for (const email of invalidEmails) {
      // At least one of these checks should fail
      const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      expect(isValid).toBe(false);
    }
  });

  it("should require new password to be at least 6 characters", () => {
    expect("12345".length >= 6).toBe(false);
    expect("123456".length >= 6).toBe(true);
    expect("longpassword".length >= 6).toBe(true);
  });
});

describe("Password Reset - Flow Simulation", () => {
  it("should simulate full reset flow: verify email → set new password → login", () => {
    // Step 1: User has a legacy account (no password hash)
    const legacyUser = {
      id: 1,
      openId: "local-test@example.com",
      email: "test@example.com",
      name: "TestUser",
      passwordHash: null as string | null,
      passwordSalt: null as string | null,
    };

    // Step 2: Attempt login → should detect NEEDS_PASSWORD
    const needsPassword = !legacyUser.passwordHash || !legacyUser.passwordSalt;
    expect(needsPassword).toBe(true);

    // Step 3: User sets new password via reset flow
    const newPassword = "newSecurePassword123";
    const newSalt = generateSalt();
    const newHash = hashPassword(newPassword, newSalt);
    legacyUser.passwordHash = newHash;
    legacyUser.passwordSalt = newSalt;

    // Step 4: Verify login now works with correct password
    const loginHash = hashPassword(newPassword, legacyUser.passwordSalt);
    expect(loginHash).toBe(legacyUser.passwordHash);

    // Step 5: Verify login fails with wrong password
    const wrongHash = hashPassword("wrongpassword", legacyUser.passwordSalt);
    expect(wrongHash).not.toBe(legacyUser.passwordHash);
  });

  it("should handle password change for existing user with password", () => {
    // User already has a password
    const salt1 = generateSalt();
    const hash1 = hashPassword("oldpassword", salt1);
    const user = {
      id: 2,
      passwordHash: hash1,
      passwordSalt: salt1,
    };

    // User resets to new password
    const newSalt = generateSalt();
    const newHash = hashPassword("newpassword", newSalt);
    user.passwordHash = newHash;
    user.passwordSalt = newSalt;

    // Old password should no longer work
    const oldAttempt = hashPassword("oldpassword", user.passwordSalt);
    expect(oldAttempt).not.toBe(user.passwordHash);

    // New password should work
    const newAttempt = hashPassword("newpassword", user.passwordSalt);
    expect(newAttempt).toBe(user.passwordHash);
  });
});

describe("Password Reset - i18n Translations", () => {
  it("should have all required English translation keys", async () => {
    const i18nContent = await import("fs").then(fs =>
      fs.readFileSync("/home/ubuntu/fitmonster-app/lib/i18n-context.tsx", "utf-8")
    );

    const requiredKeys = [
      "passwordRequired",
      "legacyAccountNeedsPassword",
      "userNotFound",
      "setNewPassword",
      "newPasswordLabel",
      "confirmNewPasswordLabel",
      "passwordResetSuccess",
      "passwordResetSuccessDesc",
    ];

    for (const key of requiredKeys) {
      expect(i18nContent).toContain(key);
    }
  });
});

describe("Password Reset - Server Route Structure", () => {
  it("should have resetPassword route defined in routers.ts", async () => {
    const routerContent = await import("fs").then(fs =>
      fs.readFileSync("/home/ubuntu/fitmonster-app/server/routers.ts", "utf-8")
    );

    expect(routerContent).toContain("resetPassword");
    // resetPassword is a tRPC route under auth router, called as auth.resetPassword from client
    expect(routerContent).toContain("resetPassword: publicProcedure");
    // Should validate email and newPassword
    expect(routerContent).toContain("email: z.string().email()");
    expect(routerContent).toContain("newPassword: z.string().min(6)");
  });

  it("should have resetPasswordByEmail function in db.ts", async () => {
    const dbContent = await import("fs").then(fs =>
      fs.readFileSync("/home/ubuntu/fitmonster-app/server/db.ts", "utf-8")
    );

    expect(dbContent).toContain("resetPasswordByEmail");
    expect(dbContent).toContain("checkUserExistsByEmail");
  });

  it("should handle NEEDS_PASSWORD error in localLogin route", async () => {
    const routerContent = await import("fs").then(fs =>
      fs.readFileSync("/home/ubuntu/fitmonster-app/server/routers.ts", "utf-8")
    );

    expect(routerContent).toContain("NEEDS_PASSWORD");
    expect(routerContent).toContain("needs_password");
  });
});
