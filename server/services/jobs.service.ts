import { parseJobResult, searchJobs } from "../serpapi";
import { ENV } from "../_core/env";
import { getLatestJobsUpdatedAt, searchJobsInDb, upsertJob } from "../db";

const HOURS_72_IN_MS = 72 * 60 * 60 * 1000;
const DEFAULT_QUERY = "developer";

export type DateRange = "1h" | "24h" | "72h";

export type JobSearchInput = {
  query: string;
  location?: string;
  jobTypes?: string[];
  company?: string;
  dateRange?: DateRange;
};

export type JobsSearchResult = {
  success: boolean;
  jobs: Awaited<ReturnType<typeof searchJobsInDb>>;
  total: number;
  source: "cache" | "api";
  cache: {
    stale: boolean;
    lastRefreshAt: string | null;
  };
  error?: string;
};

function normalizeSearchInput(input: JobSearchInput): JobSearchInput {
  return {
    query: input.query?.trim() || DEFAULT_QUERY,
    location: input.location?.trim() || undefined,
    jobTypes: input.jobTypes?.length ? input.jobTypes : undefined,
    company: input.company?.trim() || undefined,
    dateRange: input.dateRange,
  };
}

async function getCacheState() {
  const latestRefresh = await getLatestJobsUpdatedAt();

  if (!latestRefresh) {
    return {
      stale: true,
      lastRefreshAt: null,
    } as const;
  }

  const stale = Date.now() - latestRefresh.getTime() > HOURS_72_IN_MS;

  return {
    stale,
    lastRefreshAt: latestRefresh.toISOString(),
  } as const;
}

export async function refreshJobsCacheForQuery(
  query: string,
  location?: string
) {
  if (!ENV.serpapiKey) {
    return {
      success: false,
      fetched: 0,
      reason: "SERPAPI_KEY is not configured",
    } as const;
  }

  const apiResults = await searchJobs(query, location);
  const apiJobs = apiResults.jobs_results ?? [];

  for (const apiJob of apiJobs) {
    await upsertJob(parseJobResult(apiJob));
  }

  return {
    success: true,
    fetched: apiJobs.length,
  } as const;
}

export async function refreshWarmupQueries(): Promise<{
  success: boolean;
  refreshedQueries: Array<{ query: string; fetched: number }>;
  skipped: boolean;
  reason?: string;
}> {
  if (!ENV.serpapiKey) {
    return {
      success: false,
      refreshedQueries: [],
      skipped: true,
      reason: "SERPAPI_KEY is not configured",
    };
  }

  const warmupQueries = (ENV.cacheWarmupQueries || DEFAULT_QUERY)
    .split(",")
    .map(item => item.trim())
    .filter(Boolean);

  const refreshedQueries: Array<{ query: string; fetched: number }> = [];

  for (const query of warmupQueries) {
    const result = await refreshJobsCacheForQuery(query);
    refreshedQueries.push({
      query,
      fetched: result.success ? result.fetched : 0,
    });
  }

  return {
    success: true,
    refreshedQueries,
    skipped: false,
  };
}

export async function searchJobsWithCache(
  input: JobSearchInput
): Promise<JobsSearchResult> {
  const normalized = normalizeSearchInput(input);

  const cacheState = await getCacheState();
  const cachedJobs = await searchJobsInDb(normalized.query, {
    location: normalized.location,
    jobType: normalized.jobTypes,
    company: normalized.company,
    dateRange: normalized.dateRange,
  });

  if (cachedJobs.length > 0 && !cacheState.stale) {
    return {
      success: true,
      jobs: cachedJobs,
      total: cachedJobs.length,
      source: "cache",
      cache: cacheState,
    };
  }

  if (!ENV.serpapiKey) {
    return {
      success: true,
      jobs: cachedJobs,
      total: cachedJobs.length,
      source: "cache",
      cache: cacheState,
      error:
        cachedJobs.length === 0
          ? "SERPAPI_KEY is not configured and no cached data is available"
          : undefined,
    };
  }

  try {
    await refreshJobsCacheForQuery(normalized.query, normalized.location);

    const refreshedJobs = await searchJobsInDb(normalized.query, {
      location: normalized.location,
      jobType: normalized.jobTypes,
      company: normalized.company,
      dateRange: normalized.dateRange,
    });

    return {
      success: true,
      jobs: refreshedJobs,
      total: refreshedJobs.length,
      source: "api",
      cache: await getCacheState(),
    };
  } catch (error) {
    console.error("[JobsService] Failed to refresh from API:", error);

    return {
      success: cachedJobs.length > 0,
      jobs: cachedJobs,
      total: cachedJobs.length,
      source: "cache",
      cache: cacheState,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
