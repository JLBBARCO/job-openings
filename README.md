# job-openings

## Deploy on Vercel

This project is configured for Vercel with:

- Static frontend output in `dist/public`
- API runtime in `api/index.ts`
- Daily cron trigger (`/api/cron/jobs-refresh`) to refresh cache when stale

Required environment variables:

- `DATABASE_URL`
- `SERPAPI_KEY`
- `CRON_SECRET` (recommended for protecting cron route)
- `CACHE_WARMUP_QUERIES` (optional, comma-separated list)
- `GOOGLE_DOMAIN` (optional, defaults to `google.com`)
- `GOOGLE_COUNTRY` (optional, `gl` param, defaults to `br`)
- `GOOGLE_LANGUAGE` (optional, `hl` param, defaults to `pt-br`)

## Google Jobs Integration

- Jobs are sourced from Google Jobs via SerpApi's `google_jobs` engine, which aggregates listings from many job boards (LinkedIn, Indeed, company career sites, etc.) — not from LinkedIn directly.
- The direct "apply" link shown to users comes from the job's `apply_options` (the real destination on the originating site). Google's own `share_link` (a link back to the Google search results page) is only used as a fallback when no `apply_options` are available.
- Job type filtering matches against the `schedule_type` value detected by Google (e.g. "Full-time", "Part-time", "Contractor", "Internship", "Temp work", "Volunteer"), normalized to be consistent regardless of the response language.
- Work mode filtering (Presencial / Híbrido / Remoto) is derived from Google's `detected_extensions.work_from_home` boolean combined with the job's location text, since Google Jobs doesn't expose a 3-way category natively. See `deriveWorkMode` in `server/serpapi.ts` for the exact heuristic.

## Jobs Cache Strategy

- Search endpoint is cache-first.
- Jobs cache is considered stale after 72 hours.
- If stale, backend refreshes from SerpApi and persists to DB.
- Vercel cron calls `/api/cron/jobs-refresh` daily, but refresh only happens when 72h TTL expires.
