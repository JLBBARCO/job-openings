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

## Jobs Cache Strategy

- Search endpoint is cache-first.
- Jobs cache is considered stale after 72 hours.
- If stale, backend refreshes from SerpApi and persists to DB.
- Vercel cron calls `/api/cron/jobs-refresh` daily, but refresh only happens when 72h TTL expires.
