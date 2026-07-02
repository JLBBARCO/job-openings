import { describe, expect, it } from "vitest";
import { normalizeLocationForGoogleJobs } from "./serpapi";
import {
  matchesLocationFilter,
  tokenizeLocationFilter,
} from "./locationFilter";

describe("normalizeLocationForGoogleJobs", () => {
  it("translates 'Brasil' to the canonical English name SerpApi expects", () => {
    expect(normalizeLocationForGoogleJobs("Brasil")).toBe("Brazil");
  });

  it("translates the country segment in a city + country string", () => {
    expect(normalizeLocationForGoogleJobs("São Paulo, Brasil")).toBe(
      "São Paulo, Brazil"
    );
  });

  it("leaves already-correct locations untouched", () => {
    expect(normalizeLocationForGoogleJobs("New York, United States")).toBe(
      "New York, United States"
    );
  });

  it("returns undefined for empty input", () => {
    expect(normalizeLocationForGoogleJobs("")).toBeUndefined();
    expect(normalizeLocationForGoogleJobs(undefined)).toBeUndefined();
  });
});

describe("matchesLocationFilter", () => {
  it("ignores a bare country name and doesn't filter out valid results", () => {
    // This is the exact scenario from the bug report: user searches with
    // location "Brasil", but the job's `location` field only has the city
    // ("São Paulo, SP"), never the literal word "Brasil". Country-level
    // targeting is already handled by gl/hl, so a bare country token
    // shouldn't filter anything out locally.
    expect(matchesLocationFilter("São Paulo, SP", "Brasil")).toBe(true);
    expect(matchesLocationFilter("São Paulo, SP", "São Paulo, Brasil")).toBe(
      true
    );
  });

  it("still filters out a city that clearly doesn't match", () => {
    expect(matchesLocationFilter("Rio de Janeiro, RJ", "São Paulo")).toBe(
      false
    );
  });

  it("matches case- and accent-insensitively", () => {
    expect(matchesLocationFilter("Sao Paulo, SP", "são paulo")).toBe(true);
  });

  it("passes through when no filter is provided", () => {
    expect(matchesLocationFilter("Anywhere", undefined)).toBe(true);
  });

  it("passes through when the filter is only a bare country name", () => {
    expect(matchesLocationFilter(null, "Brasil")).toBe(true);
  });
});

describe("tokenizeLocationFilter", () => {
  it("splits comma-separated locations into trimmed tokens, dropping bare country names", () => {
    expect(tokenizeLocationFilter("São Paulo, Brasil")).toEqual(["São Paulo"]);
  });

  it("returns an empty array for a bare country name", () => {
    expect(tokenizeLocationFilter("Brasil")).toEqual([]);
  });

  it("returns an empty array for empty input", () => {
    expect(tokenizeLocationFilter(undefined)).toEqual([]);
    expect(tokenizeLocationFilter("")).toEqual([]);
  });
});
