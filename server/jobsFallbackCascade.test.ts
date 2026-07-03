import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./serpapi", async () => {
  const actual = await vi.importActual<typeof import("./serpapi")>("./serpapi");
  return {
    ...actual,
    searchJobs: vi.fn(),
  };
});

vi.mock("./db", () => ({
  upsertJob: vi.fn().mockResolvedValue(undefined),
  getLatestJobsUpdatedAt: vi.fn().mockResolvedValue(null),
  searchJobsInDb: vi.fn().mockResolvedValue([]),
}));

vi.mock("./_core/env", () => ({
  ENV: { serpapiKey: "fake-key-for-test", cacheWarmupQueries: "developer" },
}));

import { searchJobs } from "./serpapi";
import { refreshJobsCacheForQuery } from "./services/jobs.service";

const mockedSearchJobs = vi.mocked(searchJobs);

function emptyResponse(overrides: Partial<any> = {}) {
  return {
    search_metadata: { status: "Success" },
    jobs_results: [],
    ...overrides,
  } as any;
}

function withJobs() {
  return {
    search_metadata: { status: "Success" },
    jobs_results: [{ title: "Dev", company_name: "Acme", job_id: "job-1" }],
  } as any;
}

describe("refreshJobsCacheForQuery fallback cascade", () => {
  beforeEach(() => {
    mockedSearchJobs.mockReset();
  });

  it("stops at tier 1 (with location) when it already returns jobs", async () => {
    mockedSearchJobs.mockResolvedValueOnce(withJobs());

    const result = await refreshJobsCacheForQuery("developer", "São Paulo");

    expect(mockedSearchJobs).toHaveBeenCalledTimes(1);
    expect(result.fetched).toBe(1);
  });

  it("falls back to tier 2 (no location) when tier 1 is empty", async () => {
    mockedSearchJobs
      .mockResolvedValueOnce(emptyResponse())
      .mockResolvedValueOnce(withJobs());

    const result = await refreshJobsCacheForQuery("developer", "Brasil");

    expect(mockedSearchJobs).toHaveBeenCalledTimes(2);
    expect(mockedSearchJobs).toHaveBeenNthCalledWith(1, "developer", "Brasil");
    expect(mockedSearchJobs).toHaveBeenNthCalledWith(2, "developer");
    expect(result.fetched).toBe(1);
  });

  it("falls back to tier 3 (no localization at all) when tiers 1 and 2 are empty — this is the exact bug reported in production", async () => {
    mockedSearchJobs
      .mockResolvedValueOnce(
        emptyResponse({
          error: "Google hasn't returned any results for this query.",
        })
      )
      .mockResolvedValueOnce(emptyResponse())
      .mockResolvedValueOnce(withJobs());

    const result = await refreshJobsCacheForQuery("developer", "Brasil");

    expect(mockedSearchJobs).toHaveBeenCalledTimes(3);
    expect(mockedSearchJobs).toHaveBeenNthCalledWith(
      3,
      "developer",
      undefined,
      undefined,
      {
        skipLocalization: true,
      }
    );
    expect(result.fetched).toBe(1);
  });

  it("surfaces the SerpApi message when all three tiers come back empty", async () => {
    mockedSearchJobs.mockResolvedValue(
      emptyResponse({
        error: "Google hasn't returned any results for this query.",
      })
    );

    const result = await refreshJobsCacheForQuery("developer", "Brasil");

    expect(mockedSearchJobs).toHaveBeenCalledTimes(3);
    expect(result.fetched).toBe(0);
    expect(result.apiError).toBe(
      "Google hasn't returned any results for this query."
    );
  });
});
