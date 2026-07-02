import { COOKIE_NAME } from "../shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { searchJobsInDb, getJobById } from "./db";
import {
  getInMemoryJobById,
  refreshWarmupQueries,
  searchJobsWithCache,
} from "./services/jobs.service";

export const appRouter = router({
  // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  jobs: router({
    /**
     * Buscar vagas de emprego
     * Busca primeiro na SerpApi, depois armazena em cache no banco de dados
     */
    search: publicProcedure
      .input(
        z.object({
          query: z.string().min(1, "Query is required"),
          location: z.string().optional(),
          jobTypes: z.array(z.string()).optional(),
          company: z.string().optional(),
          dateRange: z.enum(["1h", "24h", "72h"]).optional(),
        })
      )
      .query(async ({ input }) => {
        try {
          return await searchJobsWithCache(input);
        } catch (error) {
          console.error("Jobs search error:", error);
          return {
            success: false,
            jobs: [],
            total: 0,
            source: "cache" as const,
            cache: {
              stale: true,
              lastRefreshAt: null,
            },
            error: error instanceof Error ? error.message : "Unknown error",
          };
        }
      }),

    refreshCache: publicProcedure.mutation(async () => {
      try {
        const result = await refreshWarmupQueries();

        return {
          success: result.success,
          refreshedQueries: result.refreshedQueries,
          skipped: result.skipped,
          reason: result.reason,
        };
      } catch (error) {
        console.error("Refresh cache error:", error);
        return {
          success: false,
          refreshedQueries: [],
          skipped: false,
          reason: error instanceof Error ? error.message : "Unknown error",
        };
      }
    }),

    /**
     * Obter detalhes de uma vaga específica
     */
    getById: publicProcedure
      .input(z.object({ jobId: z.string() }))
      .query(async ({ input }) => {
        try {
          const job =
            (await getJobById(input.jobId)) ?? getInMemoryJobById(input.jobId);

          if (!job) {
            return {
              success: false,
              job: null,
              error: "Job not found",
            };
          }

          return {
            success: true,
            job,
          };
        } catch (error) {
          console.error("Get job error:", error);
          return {
            success: false,
            job: null,
            error: error instanceof Error ? error.message : "Unknown error",
          };
        }
      }),

    /**
     * Buscar vagas no cache do banco de dados
     */
    searchCache: publicProcedure
      .input(
        z.object({
          query: z.string().optional(),
          location: z.string().optional(),
          jobTypes: z.array(z.string()).optional(),
          company: z.string().optional(),
          dateRange: z.enum(["1h", "24h", "72h"]).optional(),
        })
      )
      .query(async ({ input }) => {
        try {
          const jobs = await searchJobsInDb(input.query, {
            location: input.location,
            jobType: input.jobTypes,
            company: input.company,
            dateRange: input.dateRange,
          });

          return {
            success: true,
            jobs,
            total: jobs.length,
          };
        } catch (error) {
          console.error("Search cache error:", error);
          return {
            success: false,
            jobs: [],
            total: 0,
            error: error instanceof Error ? error.message : "Unknown error",
          };
        }
      }),
  }),
});

export type AppRouter = typeof appRouter;
