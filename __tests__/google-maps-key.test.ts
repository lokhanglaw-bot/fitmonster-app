import { describe, it, expect } from "vitest";

describe("Google Maps API Key", () => {
  it("should be set as environment variable", () => {
    const key = process.env.GOOGLE_MAPS_API_KEY;
    expect(key).toBeDefined();
    expect(key).not.toBe("");
    expect(key!.startsWith("AIza")).toBe(true);
  });

  it("should be a valid API key format", () => {
    const key = process.env.GOOGLE_MAPS_API_KEY!;
    // Google API keys are typically 39 characters
    expect(key.length).toBeGreaterThanOrEqual(30);
    expect(key.length).toBeLessThanOrEqual(50);
  });
});
