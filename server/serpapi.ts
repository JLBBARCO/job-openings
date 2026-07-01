import { ENV } from "./_core/env";

export interface SerpApiJobResult {
  title: string;
  company_name: string;
  location?: string;
  via?: string;
  // Link to Google's own job listing page (NOT a direct apply link).
  share_link?: string;
  thumbnail?: string;
  extensions?: string[];
  detected_extensions?: {
    posted_at?: string;
    salary?: string;
    // The Google Jobs API returns this field as `schedule_type`
    // (e.g. "Full-time", "Part-time", "Contractor", "Internship").
    // There is no `job_type` field in the real API response.
    schedule_type?: string;
  };
  description?: string;
  job_highlights?: Array<{
    title: string;
    items: string[];
  }>;
  // Direct links to apply on the original source (LinkedIn, Indeed, company site, etc.)
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
 * SerpApi resolve o parâmetro `location` contra sua própria base de
 * localizações, que usa nomes em inglês (ex: "Sao Paulo, State of Sao
 * Paulo, Brazil"). Se o usuário digitar o nome em português (ex: "Brasil"),
 * a localização não é reconhecida e a Google Jobs API retorna 0 vagas,
 * silenciosamente, sem nenhum erro. Traduzimos os nomes de país mais comuns
 * para reduzir esse problema.
 */
const LOCATION_TRANSLATIONS: Record<string, string> = {
  brasil: "Brazil",
  "estados unidos": "United States",
  "reino unido": "United Kingdom",
  alemanha: "Germany",
  espanha: "Spain",
  franca: "France",
  italia: "Italy",
  mexico: "Mexico",
  japao: "Japan",
  india: "India",
};

export function normalizeLocationForGoogleJobs(
  location?: string
): string | undefined {
  const trimmed = location?.trim();
  if (!trimmed) return undefined;

  const parts = trimmed.split(",").map(part => {
    const key = part
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    return LOCATION_TRANSLATIONS[key] ?? part.trim();
  });

  return parts.join(", ");
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
    // Localization params. Without these Google defaults to a generic
    // US/English result set, which doesn't match this app's Brazilian,
    // Portuguese-speaking audience (see location placeholders like
    // "São Paulo, Brasil" and job type labels like "CLT"/"PJ").
    google_domain: ENV.googleDomain,
    gl: ENV.googleCountry,
    hl: ENV.googleLanguage,
  });

  const normalizedLocation = normalizeLocationForGoogleJobs(location);
  if (normalizedLocation) {
    params.append("location", normalizedLocation);
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
 * A Google Jobs API pode retornar `schedule_type` em inglês ou português
 * dependendo do parâmetro `hl` usado na busca (ex: "Full-time" vs
 * "Tempo integral"). Normalizamos para um conjunto canônico de valores em
 * inglês para que o filtro de tipo de vaga funcione de forma consistente
 * independentemente do idioma retornado.
 */
const SCHEDULE_TYPE_MAP: Record<string, string> = {
  "full-time": "Full-time",
  "full time": "Full-time",
  "tempo integral": "Full-time",
  "periodo integral": "Full-time",
  "part-time": "Part-time",
  "part time": "Part-time",
  "meio periodo": "Part-time",
  contractor: "Contractor",
  contrato: "Contractor",
  pj: "Contractor",
  internship: "Internship",
  estagio: "Internship",
  "temp work": "Temp work",
  temporario: "Temp work",
  "per diem": "Per diem",
  volunteer: "Volunteer",
  voluntario: "Volunteer",
};

function normalizeScheduleType(raw?: string): string {
  if (!raw) return "";
  const key = raw
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
  return SCHEDULE_TYPE_MAP[key] ?? raw;
}

/**
 * Converte uma string de data relativa retornada pela Google Jobs API
 * (ex: "3 days ago", "há 3 dias", "Just posted", "hoje") em uma Date real.
 * Retorna null se o texto não puder ser interpretado.
 */
export function parseRelativePostedAt(
  text?: string,
  referenceDate: Date = new Date()
): Date | null {
  if (!text) return null;

  const normalized = text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, ""); // remove acentos (há -> ha)

  if (/(just posted|agora mesmo|hoje|today)/.test(normalized)) {
    return referenceDate;
  }

  const match = normalized.match(
    /(\d+)\+?\s*(minute|minuto|hour|hora|day|dia|week|semana|month|mes)/
  );
  if (!match) return null;

  const amount = parseInt(match[1], 10);
  const unit = match[2];

  const msPerUnit: Record<string, number> = {
    minute: 60_000,
    minuto: 60_000,
    hour: 3_600_000,
    hora: 3_600_000,
    day: 86_400_000,
    dia: 86_400_000,
    week: 604_800_000,
    semana: 604_800_000,
    month: 2_592_000_000,
    mes: 2_592_000_000,
  };

  const unitMs = msPerUnit[unit];
  if (!unitMs) return null;

  return new Date(referenceDate.getTime() - amount * unitMs);
}

/**
 * Extrair informações estruturadas de uma vaga
 */
export function parseJobResult(job: SerpApiJobResult) {
  const extensions = job.detected_extensions || {};

  // A Google Jobs API não retorna um link de candidatura em `share_link`
  // (esse campo aponta para a própria página de busca do Google). O link
  // real para se candidatar (LinkedIn, Indeed, site da empresa, etc.) vem
  // em `apply_options`. Preferimos o primeiro apply_option e usamos
  // `share_link` apenas como último recurso.
  const applyLink = job.apply_options?.[0]?.link || job.share_link;

  return {
    jobId: job.job_id,
    title: job.title,
    companyName: job.company_name,
    location: job.location,
    description: job.description || "",
    jobType: normalizeScheduleType(extensions.schedule_type),
    salary: extensions.salary || "",
    shareLink: applyLink,
    thumbnail: job.thumbnail,
    via: job.via,
    postedAt: parseRelativePostedAt(extensions.posted_at),
    rawData: JSON.stringify(job),
  };
}
