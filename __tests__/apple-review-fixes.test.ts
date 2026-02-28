import { describe, it, expect, vi } from "vitest";

/**
 * Tests for Apple App Store review fixes (Round 99)
 * Guideline 4.0, 5.1.1, 1.4.1, 2.5.4, 5.1.1(v)
 */

describe("Apple Review Fix: OAuth uses WebBrowser (Guideline 4.0)", () => {
  it("should import WebBrowser in oauth.ts", async () => {
    const oauthSource = await import("fs").then((fs) =>
      fs.readFileSync("constants/oauth.ts", "utf-8")
    );
    expect(oauthSource).toContain('import * as WebBrowser from "expo-web-browser"');
  });

  it("should use WebBrowser.openAuthSessionAsync instead of Linking.openURL for native", async () => {
    const oauthSource = await import("fs").then((fs) =>
      fs.readFileSync("constants/oauth.ts", "utf-8")
    );
    expect(oauthSource).toContain("WebBrowser.openAuthSessionAsync");
    // The startOAuthLogin function should contain WebBrowser.openAuthSessionAsync
    const startOAuthSection = oauthSource.split("async function startOAuthLogin")[1];
    expect(startOAuthSection).toBeDefined();
    expect(startOAuthSection).toContain("WebBrowser.openAuthSessionAsync");
  });
});

describe("Apple Review Fix: Camera Purpose String (Guideline 5.1.1)", () => {
  it("should have detailed NSCameraUsageDescription in app.config.ts", async () => {
    const configSource = await import("fs").then((fs) =>
      fs.readFileSync("app.config.ts", "utf-8")
    );
    expect(configSource).toContain("NSCameraUsageDescription");
    // Must explain what the camera is used for with a specific example
    expect(configSource).toContain("meals");
    expect(configSource).toContain("nutritional analysis");
  });

  it("should have NSPhotoLibraryUsageDescription in app.config.ts", async () => {
    const configSource = await import("fs").then((fs) =>
      fs.readFileSync("app.config.ts", "utf-8")
    );
    expect(configSource).toContain("NSPhotoLibraryUsageDescription");
  });
});

describe("Apple Review Fix: Food Scanner Citations (Guideline 1.4.1)", () => {
  it("should have citation UI in camera.tsx", async () => {
    const cameraSource = await import("fs").then((fs) =>
      fs.readFileSync("app/(tabs)/camera.tsx", "utf-8")
    );
    expect(cameraSource).toContain("citationCard");
    expect(cameraSource).toContain("fdc.nal.usda.gov");
    expect(cameraSource).toContain("WHO Healthy Diet Guidelines");
  });

  it("should have citation translations in i18n", async () => {
    const i18nSource = await import("fs").then((fs) =>
      fs.readFileSync("lib/i18n-context.tsx", "utf-8")
    );
    expect(i18nSource).toContain("nutritionDataSource");
    expect(i18nSource).toContain("nutritionCitationText");
    // Check both English and Chinese translations exist
    expect(i18nSource).toContain("Data Sources");
    expect(i18nSource).toContain("資料來源");
  });

  it("should have citation styles defined", async () => {
    const cameraSource = await import("fs").then((fs) =>
      fs.readFileSync("app/(tabs)/camera.tsx", "utf-8")
    );
    expect(cameraSource).toContain("citationTitle:");
    expect(cameraSource).toContain("citationText:");
    expect(cameraSource).toContain("citationLink:");
  });
});

describe("Apple Review Fix: Remove Audio Background Mode (Guideline 2.5.4)", () => {
  it("should have supportsBackgroundPlayback set to false", async () => {
    const configSource = await import("fs").then((fs) =>
      fs.readFileSync("app.config.ts", "utf-8")
    );
    expect(configSource).toContain("supportsBackgroundPlayback: false");
  });

  it("should have supportsPictureInPicture set to false", async () => {
    const configSource = await import("fs").then((fs) =>
      fs.readFileSync("app.config.ts", "utf-8")
    );
    expect(configSource).toContain("supportsPictureInPicture: false");
  });
});

describe("Apple Review Fix: Account Deletion (Guideline 5.1.1(v))", () => {
  it("should have delete account button in edit-profile.tsx", async () => {
    const editProfileSource = await import("fs").then((fs) =>
      fs.readFileSync("app/edit-profile.tsx", "utf-8")
    );
    expect(editProfileSource).toContain("Delete Account");
    expect(editProfileSource).toContain("deleteAccount");
    expect(editProfileSource).toContain("auth.deleteAccount");
  });

  it("should have delete account modal in index.tsx", async () => {
    const indexSource = await import("fs").then((fs) =>
      fs.readFileSync("app/(tabs)/index.tsx", "utf-8")
    );
    expect(indexSource).toContain("deleteAccountMutation");
    expect(indexSource).toContain("showDeleteAccountModal");
    expect(indexSource).toContain("confirmDeleteAccount");
  });

  it("should have delete account translations", async () => {
    const i18nSource = await import("fs").then((fs) =>
      fs.readFileSync("lib/i18n-context.tsx", "utf-8")
    );
    expect(i18nSource).toContain("deleteAccount:");
    expect(i18nSource).toContain("deleteAccountTitle:");
    expect(i18nSource).toContain("deleteAccountConfirm:");
  });
});
