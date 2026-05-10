import { describe, it, expect } from "vitest";

describe("DeepSeek API Key Validation", () => {
  it("should authenticate successfully with DeepSeek API", async () => {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    expect(apiKey).toBeTruthy();

    const response = await fetch("https://api.deepseek.com/models", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    // 200 means valid key, 401 means invalid
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.data).toBeDefined();
    expect(data.data.length).toBeGreaterThan(0);
  });
});
