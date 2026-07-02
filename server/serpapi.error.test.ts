import { afterEach, describe, expect, it, vi } from "vitest";
import { searchJobs } from "./serpapi";
import { ENV } from "./_core/env";

function mockFetchOnce(body: unknown, status = 200) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      json: async () => body,
      text: async () => JSON.stringify(body),
    })
  );
}

describe("searchJobs error handling", () => {
  const originalKey = ENV.serpapiKey;

  afterEach(() => {
    vi.unstubAllGlobals();
    ENV.serpapiKey = originalKey;
  });

  it("throws when SerpApi returns an in-body error with HTTP 200 (e.g. out of searches)", async () => {
    ENV.serpapiKey = "fake-key-for-test";
    mockFetchOnce(
      { error: "Your account has run out of searches for this month." },
      200
    );

    await expect(searchJobs("developer")).rejects.toThrow(
      /Your account has run out of searches/
    );
  });

  it("throws when SerpApi returns an in-body error for an invalid key", async () => {
    ENV.serpapiKey = "fake-key-for-test";
    mockFetchOnce({ error: "Invalid API key." }, 200);

    await expect(searchJobs("developer")).rejects.toThrow(/Invalid API key/);
  });

  it("returns normally when the response has jobs_results and no error field", async () => {
    ENV.serpapiKey = "fake-key-for-test";
    mockFetchOnce({
      search_metadata: { status: "Success" },
      jobs_results: [
        {
          title: "Software Engineer",
          company_name: "Acme",
          job_id: "abc123",
        },
      ],
    });

    const result = await searchJobs("developer");
    expect(result.jobs_results).toHaveLength(1);
  });
});
