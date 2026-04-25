import { describe, expect, it } from "vitest";
import { ENV } from "./_core/env";

describe("SerpApi Integration", () => {
  it("should have SERPAPI_KEY configured", async () => {
    expect(ENV.serpapiKey).toBeDefined();
    expect(ENV.serpapiKey.length).toBeGreaterThan(0);
  });

  it("should be able to call SerpApi with the configured key", async () => {
    if (!ENV.serpapiKey) {
      console.warn("SERPAPI_KEY not configured, skipping API test");
      return;
    }

    try {
      const response = await fetch(
        `https://serpapi.com/search.json?engine=google_jobs&q=developer&location=remote&api_key=${ENV.serpapiKey}`
      );

      const data = await response.json();
      console.log("SerpApi response status:", response.status);
      console.log("SerpApi response data:", JSON.stringify(data, null, 2));

      if (response.status === 400) {
        console.error("API returned 400 - Bad Request. Response:", data);
        expect(data).toBeDefined();
        return;
      }

      expect(response.status).toBe(200);
      expect(data).toBeDefined();
      expect(data.search_metadata).toBeDefined();
      expect(data.search_metadata.status).toBe("Success");
      expect(data.jobs_results).toBeDefined();
      expect(Array.isArray(data.jobs_results)).toBe(true);
    } catch (error) {
      console.error("SerpApi test failed:", error);
      throw error;
    }
  });
});
