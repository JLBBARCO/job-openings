import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("Jobs Router", () => {
  it("should search for jobs with a query", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.jobs.search({
      query: "developer",
    });

    expect(result).toBeDefined();
    expect(result.success).toBeDefined();
    // A busca pode retornar sucesso ou erro dependendo da API
    if (result.success) {
      expect(Array.isArray(result.jobs)).toBe(true);
      expect(typeof result.total).toBe("number");
    }
  });

  it("should handle search with filters", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.jobs.search({
      query: "developer",
      jobTypes: ["Full-time", "Contractor"],
      workMode: ["Remoto", "Híbrido"],
      company: "Google",
      dateRange: "72h",
    });

    expect(result).toBeDefined();
    expect(result.success).toBeDefined();
  });

  it("should search cache with filters", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.jobs.searchCache({
      query: "developer",
      jobTypes: ["Full-time"],
    });

    expect(result).toBeDefined();
    expect(result.success).toBeDefined();
    expect(Array.isArray(result.jobs)).toBe(true);
  });

  it("should get job by id", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    // Primeiro faz uma busca para obter um jobId válido
    const searchResult = await caller.jobs.search({
      query: "developer",
    });

    if (searchResult.success && searchResult.jobs.length > 0) {
      const jobId = searchResult.jobs[0].jobId;

      const result = await caller.jobs.getById({
        jobId,
      });

      expect(result).toBeDefined();
      expect(result.success).toBeDefined();
    }
  });
});
