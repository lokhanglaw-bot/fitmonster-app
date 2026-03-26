import { describe, it, expect } from "vitest";

describe("Google OAuth Client IDs", () => {
  it("GOOGLE_WEB_CLIENT_ID is set and looks like a valid Google Client ID", () => {
    const val = process.env.GOOGLE_WEB_CLIENT_ID;
    expect(val).toBeDefined();
    expect(val!.length).toBeGreaterThan(10);
    expect(val).toContain(".apps.googleusercontent.com");
  });

  it("GOOGLE_IOS_CLIENT_ID is set and looks like a valid Google Client ID", () => {
    const val = process.env.GOOGLE_IOS_CLIENT_ID;
    expect(val).toBeDefined();
    expect(val!.length).toBeGreaterThan(10);
    expect(val).toContain(".apps.googleusercontent.com");
  });

  it("GOOGLE_ANDROID_CLIENT_ID is set and looks like a valid Google Client ID", () => {
    const val = process.env.GOOGLE_ANDROID_CLIENT_ID;
    expect(val).toBeDefined();
    expect(val!.length).toBeGreaterThan(10);
    expect(val).toContain(".apps.googleusercontent.com");
  });
});
