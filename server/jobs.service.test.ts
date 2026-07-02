import { describe, expect, it } from "vitest";
import { applyApiFilters, type JobSearchInput } from "./services/jobs.service";
import type { parseJobResult } from "./serpapi";

type ParsedApiJob = ReturnType<typeof parseJobResult>;

function makeJob(overrides: Partial<ParsedApiJob> = {}): ParsedApiJob {
  return {
    jobId: "job-1",
    title: "Software Engineer",
    companyName: "Acme Inc",
    location: "São Paulo, SP",
    description: "",
    jobType: "Full-time",
    workMode: "Presencial",
    salary: "",
    shareLink: "https://example.com",
    thumbnail: undefined,
    via: "LinkedIn",
    postedAt: null,
    rawData: "{}",
    ...overrides,
  };
}

const baseInput: JobSearchInput = { query: "developer" };

describe("applyApiFilters", () => {
  it("returns all jobs when no filters are set", () => {
    const jobs = [makeJob(), makeJob({ jobId: "job-2" })];
    expect(applyApiFilters(jobs, baseInput)).toHaveLength(2);
  });

  it("filters by workMode correctly when it matches", () => {
    const jobs = [
      makeJob({ jobId: "1", workMode: "Remoto" }),
      makeJob({ jobId: "2", workMode: "Presencial" }),
    ];

    const result = applyApiFilters(jobs, {
      ...baseInput,
      workMode: ["Remoto"],
    });

    expect(result).toHaveLength(1);
    expect(result[0].jobId).toBe("1");
  });

  it("does NOT zero out results when workMode values match exactly (regression for user-reported bug)", () => {
    const jobs = [
      makeJob({ jobId: "1", workMode: "Presencial" }),
      makeJob({ jobId: "2", workMode: "Híbrido" }),
      makeJob({ jobId: "3", workMode: "Remoto" }),
    ];

    const result = applyApiFilters(jobs, {
      ...baseInput,
      workMode: ["Presencial", "Híbrido", "Remoto"],
    });

    // All three canonical values should match their respective jobs —
    // if this ever returns 0, the filter's literal values have drifted
    // from what deriveWorkMode() actually produces.
    expect(result).toHaveLength(3);
  });

  it("filters out jobs whose workMode doesn't match any selected option", () => {
    const jobs = [makeJob({ workMode: "Presencial" })];

    const result = applyApiFilters(jobs, {
      ...baseInput,
      workMode: ["Remoto"],
    });

    expect(result).toHaveLength(0);
  });

  it("combines jobType and workMode filters with AND semantics", () => {
    const jobs = [
      makeJob({ jobId: "1", jobType: "Full-time", workMode: "Remoto" }),
      makeJob({ jobId: "2", jobType: "Contractor", workMode: "Remoto" }),
    ];

    const result = applyApiFilters(jobs, {
      ...baseInput,
      jobTypes: ["Full-time"],
      workMode: ["Remoto"],
    });

    expect(result).toHaveLength(1);
    expect(result[0].jobId).toBe("1");
  });
});
