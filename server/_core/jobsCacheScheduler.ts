import type { Express, Request, Response } from "express";
import { ENV } from "./env";
import { getLatestJobsUpdatedAt } from "../db";
import { refreshWarmupQueries } from "../services/jobs.service";

const HOURS_72_IN_MS = 72 * 60 * 60 * 1000;
const CHECK_INTERVAL_MS = 60 * 60 * 1000;

let schedulerInterval: NodeJS.Timeout | null = null;

function isCronAuthorized(req: Request): boolean {
  if (!ENV.cronSecret) {
    return true;
  }

  const authHeader = req.headers.authorization;
  const headerToken = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : undefined;

  const queryToken =
    typeof req.query.token === "string" ? req.query.token : undefined;

  return headerToken === ENV.cronSecret || queryToken === ENV.cronSecret;
}

export async function runJobsCacheRefreshIfNeeded() {
  const latestRefreshAt = await getLatestJobsUpdatedAt();
  const isStale =
    !latestRefreshAt || Date.now() - latestRefreshAt.getTime() > HOURS_72_IN_MS;

  if (!isStale) {
    return {
      refreshed: false,
      reason: "cache-is-fresh",
      lastRefreshAt: latestRefreshAt?.toISOString() ?? null,
    } as const;
  }

  const result = await refreshWarmupQueries();

  return {
    refreshed: result.success,
    reason: result.reason,
    skipped: result.skipped,
    refreshedQueries: result.refreshedQueries,
    lastRefreshAt: latestRefreshAt?.toISOString() ?? null,
  } as const;
}

export function startJobsCacheScheduler() {
  if (schedulerInterval) {
    return;
  }

  runJobsCacheRefreshIfNeeded().catch(error => {
    console.error("[JobsCacheScheduler] Initial refresh check failed:", error);
  });

  schedulerInterval = setInterval(() => {
    runJobsCacheRefreshIfNeeded().catch(error => {
      console.error(
        "[JobsCacheScheduler] Scheduled refresh check failed:",
        error
      );
    });
  }, CHECK_INTERVAL_MS);
}

export function registerJobsCacheCronRoute(app: Express) {
  app.get("/api/cron/jobs-refresh", async (req: Request, res: Response) => {
    if (!isCronAuthorized(req)) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized",
      });
    }

    try {
      const result = await runJobsCacheRefreshIfNeeded();
      return res.status(200).json({
        success: true,
        ...result,
      });
    } catch (error) {
      console.error("[JobsCacheScheduler] Cron refresh failed:", error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });
}
