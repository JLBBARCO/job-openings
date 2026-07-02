import { parseJobResult, searchJobs } from "../serpapi.js";
import { ENV } from "../_core/env.js";
import { getLatestJobsUpdatedAt, searchJobsInDb, upsertJob } from "../db.js";

const HOURS_72_IN_MS = 72 * 60 * 60 * 1000;
const DEFAULT_QUERY = "developer";
type ParsedApiJob = ReturnType<typeof parseJobResult>;

const inMemoryJobsById = new Map<string, ParsedApiJob>();

export type DateRange = "1h" | "24h" | "72h";

export type JobSearchInput = {
  query: string;
  location?: string;
  jobTypes?: string[];
  workMode?: string[];
  company?: string;
  dateRange?: DateRange;
};

export type JobsSearchResult = {
  success: boolean;
  jobs: Array<
    Awaited<ReturnType<typeof searchJobsInDb>>[number] | ParsedApiJob
  >;
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
    workMode: input.workMode?.length ? input.workMode : undefined,
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
      jobs: [] as ParsedApiJob[],
      reason: "SERPAPI_KEY is not configured",
    } as const;
  }

  let apiResults = await searchJobs(query, location);
  let apiJobs = apiResults.jobs_results ?? [];

  // A localização digitada pelo usuário pode não corresponder a nenhuma
  // entrada na base de localizações da SerpApi (typos, bairros, nomes não
  // suportados etc.), o que faz a Google Jobs API retornar 0 vagas sem
  // sinalizar erro algum. Como já restringimos a busca ao Brasil via
  // `gl`/`hl`, tentamos novamente sem a localização em vez de devolver uma
  // lista vazia para o usuário.
  if (apiJobs.length === 0 && location) {
    apiResults = await searchJobs(query);
    apiJobs = apiResults.jobs_results ?? [];
  }

  const parsedJobs = apiJobs.map(parseJobResult);

  for (const parsed of parsedJobs) {
    inMemoryJobsById.set(parsed.jobId, parsed);
    await upsertJob(parsed);
  }

  // A SerpApi pode responder com HTTP 200 e ainda assim incluir um campo
  // `error` (cota mensal esgotada, "Google hasn't returned any results for
  // this query.", parâmetro inválido, etc). Sem isso, esses casos viravam
  // silenciosamente "0 vagas encontradas" sem indicar o motivo real.
  const apiError = apiJobs.length === 0 ? apiResults.error : undefined;

  return {
    success: true,
    fetched: apiJobs.length,
    jobs: parsedJobs,
    apiError,
  } as const;
}

export function getInMemoryJobById(jobId: string) {
  return inMemoryJobsById.get(jobId);
}

export function applyApiFilters(
  jobs: ParsedApiJob[],
  input: JobSearchInput
): ParsedApiJob[] {
  // Note: we deliberately do NOT re-filter by `input.location` here. These
  // jobs came straight from a SerpApi search that was already scoped
  // geographically via the `location`/`gl`/`hl` params (see searchJobs).
  // Re-filtering by matching the user's raw location text against each
  // job's short `location` field (usually just "City, State", never the
  // country name) double-filters and can wipe out perfectly valid results
  // — e.g. searching location="Brasil" would filter out every job whose
  // location field is "São Paulo, SP".
  return jobs.filter(job => {
    if (input.jobTypes && input.jobTypes.length > 0) {
      if (!job.jobType || !input.jobTypes.includes(job.jobType)) {
        return false;
      }
    }

    if (input.workMode && input.workMode.length > 0) {
      if (!job.workMode || !input.workMode.includes(job.workMode)) {
        return false;
      }
    }

    if (input.company) {
      const companyName = (job.companyName || "").toLowerCase();
      if (!companyName.includes(input.company.toLowerCase())) {
        return false;
      }
    }

    return true;
  });
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
    workMode: normalized.workMode,
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
    const refreshResult = await refreshJobsCacheForQuery(
      normalized.query,
      normalized.location
    );

    const refreshedJobs = await searchJobsInDb(normalized.query, {
      location: normalized.location,
      jobType: normalized.jobTypes,
      workMode: normalized.workMode,
      company: normalized.company,
      dateRange: normalized.dateRange,
    });

    if (refreshedJobs.length === 0 && refreshResult.jobs.length > 0) {
      const filteredApiJobs = applyApiFilters(refreshResult.jobs, normalized);

      return {
        success: true,
        jobs: filteredApiJobs,
        total: filteredApiJobs.length,
        source: "api",
        cache: await getCacheState(),
        error:
          filteredApiJobs.length === 0
            ? "A SerpApi retornou vagas, mas nenhuma passou nos filtros aplicados (tipo de vaga, modalidade ou empresa). Tente remover algum filtro."
            : undefined,
      };
    }

    return {
      success: true,
      jobs: refreshedJobs,
      total: refreshedJobs.length,
      source: "api",
      cache: await getCacheState(),
      error:
        refreshedJobs.length === 0
          ? (refreshResult.apiError ??
            "A SerpApi não retornou nenhuma vaga para essa busca.")
          : undefined,
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
