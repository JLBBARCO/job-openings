import { describe, expect, it } from "vitest";
import {
  parseJobResult,
  parseRelativePostedAt,
  type SerpApiJobResult,
} from "./serpapi";

describe("parseJobResult", () => {
  it("uses the direct apply_options link instead of the Google share_link", () => {
    const job: SerpApiJobResult = {
      title: "Software Engineer",
      company_name: "Acme Inc",
      location: "São Paulo, Brasil",
      via: "LinkedIn",
      share_link: "https://www.google.com/search?ibp=htl;jobs&q=...",
      apply_options: [
        { title: "LinkedIn", link: "https://www.linkedin.com/jobs/view/123" },
      ],
      job_id: "abc123",
    };

    const parsed = parseJobResult(job);

    expect(parsed.shareLink).toBe("https://www.linkedin.com/jobs/view/123");
  });

  it("falls back to share_link when there are no apply_options", () => {
    const job: SerpApiJobResult = {
      title: "Software Engineer",
      company_name: "Acme Inc",
      job_id: "abc123",
      share_link: "https://www.google.com/search?ibp=htl;jobs&q=...",
    };

    const parsed = parseJobResult(job);

    expect(parsed.shareLink).toBe(
      "https://www.google.com/search?ibp=htl;jobs&q=..."
    );
  });

  it("reads jobType from detected_extensions.schedule_type", () => {
    const job: SerpApiJobResult = {
      title: "Software Engineer",
      company_name: "Acme Inc",
      job_id: "abc123",
      detected_extensions: { schedule_type: "Full-time" },
    };

    const parsed = parseJobResult(job);

    expect(parsed.jobType).toBe("Full-time");
  });

  it("normalizes Portuguese schedule_type values to the canonical English label", () => {
    const job: SerpApiJobResult = {
      title: "Software Engineer",
      company_name: "Acme Inc",
      job_id: "abc123",
      detected_extensions: { schedule_type: "Tempo integral" },
    };

    const parsed = parseJobResult(job);

    expect(parsed.jobType).toBe("Full-time");
  });
});

describe("parseRelativePostedAt", () => {
  const reference = new Date("2026-07-01T12:00:00Z");

  it("parses English relative dates", () => {
    const result = parseRelativePostedAt("3 days ago", reference);
    expect(result?.toISOString()).toBe("2026-06-28T12:00:00.000Z");
  });

  it("parses Portuguese relative dates", () => {
    const result = parseRelativePostedAt("há 3 dias", reference);
    expect(result?.toISOString()).toBe("2026-06-28T12:00:00.000Z");
  });

  it("treats 'Just posted' as the reference date", () => {
    const result = parseRelativePostedAt("Just posted", reference);
    expect(result?.toISOString()).toBe(reference.toISOString());
  });

  it("returns null for unrecognized text", () => {
    expect(parseRelativePostedAt("unknown format", reference)).toBeNull();
    expect(parseRelativePostedAt(undefined, reference)).toBeNull();
  });
});
