import { ENV } from "./_core/env";

export interface SerpApiJobResult {
  title: string;
  company_name: string;
  location?: string;
  via?: string;
  share_link?: string;
  thumbnail?: string;
  extensions?: string[];
  detected_extensions?: {
    posted_at?: string;
    salary?: string;
    schedule_type?: string;
    job_type?: string;
  };
  description?: string;
  job_highlights?: Array<{
    title: string;
    items: string[];
  }>;
  apply_options?: Array<{
    title: string;
    link: string;
  }>;
  job_id: string;
}

export interface SerpApiResponse {
  search_metadata: {
    id: string;
    status: string;
    json_endpoint: string;
    created_at: string;
    processed_at: string;
    google_jobs_url: string;
    raw_html_file: string;
    total_time_taken: number;
  };
  search_parameters: {
    engine: string;
    q: string;
    location?: string;
    google_domain: string;
    hl: string;
    gl: string;
    type: string;
  };
  filters?: Array<{
    name: string;
    values: Array<{
      value: string;
      link: string;
      uds?: string;
    }>;
  }>;
  jobs_results: SerpApiJobResult[];
  next_page_token?: string;
}

/**
 * Buscar vagas de emprego na SerpApi
 * @param query - Termo de busca (ex: "Python Developer")
 * @param location - Localização (ex: "São Paulo, Brasil")
 * @param pageToken - Token para paginação
 * @returns Resposta da SerpApi com vagas
 */
export async function searchJobs(
  query: string,
  location?: string,
  pageToken?: string
): Promise<SerpApiResponse> {
  if (!ENV.serpapiKey) {
    throw new Error("SERPAPI_KEY is not configured");
  }

  const params = new URLSearchParams({
    engine: "google_jobs",
    q: query,
    api_key: ENV.serpapiKey,
  });

  if (location) {
    params.append("location", location);
  }

  if (pageToken) {
    params.append("next_page_token", pageToken);
  }

  const url = `https://serpapi.com/search.json?${params.toString()}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(url, { signal: controller.signal });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      throw new Error(`SerpApi error: ${response.status} - ${errorText}`);
    }

    const data: SerpApiResponse = await response.json();
    return data;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("SerpApi request timed out after 15s");
    }

    console.error("SerpApi search error:", error);
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Extrair informações estruturadas de uma vaga
 */
export function parseJobResult(job: SerpApiJobResult) {
  const extensions = job.detected_extensions || {};

  return {
    jobId: job.job_id,
    title: job.title,
    companyName: job.company_name,
    location: job.location,
    description: job.description || "",
    jobType: extensions.job_type || "",
    salary: extensions.salary || "",
    shareLink: job.share_link,
    thumbnail: job.thumbnail,
    via: job.via,
    postedAt: null as Date | null, // Será preenchido com data de criação
    rawData: JSON.stringify(job),
  };
}
