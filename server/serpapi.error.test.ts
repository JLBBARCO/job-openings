import { afterEach, describe, expect, it, vi } from "vitest";
import { searchJobs, isNoResultsMessage } from "./serpapi";
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

  it("does NOT throw for the 'no results' pseudo-error — this must stay recoverable", async () => {
    // This is the exact bug found in production: SerpApi reports
    // "Google hasn't returned any results for this query." via the same
    // `error` field used for fatal account issues. Throwing here would
    // short-circuit refreshJobsCacheForQuery's fallback cascade (retry
    // without location, retry without gl/hl) before it ever runs.
    ENV.serpapiKey = "fake-key-for-test";
    mockFetchOnce({
      search_metadata: { status: "Success" },
      error: "Google hasn't returned any results for this query.",
    });

    const result = await searchJobs("developer", "Brasil");
    expect(result.error).toBe(
      "Google hasn't returned any results for this query."
    );
    expect(result.jobs_results ?? []).toHaveLength(0);
  });
});

describe("isNoResultsMessage", () => {
  it("recognizes SerpApi's zero-results message", () => {
    expect(
      isNoResultsMessage("Google hasn't returned any results for this query.")
    ).toBe(true);
    expect(isNoResultsMessage("No results found.")).toBe(true);
  });

  it("does not classify fatal account errors as no-results", () => {
    expect(
      isNoResultsMessage("Your account has run out of searches for this month.")
    ).toBe(false);
    expect(isNoResultsMessage("Invalid API key.")).toBe(false);
  });
});
