export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  serpapiKey: process.env.SERPAPI_KEY ?? "",
  cronSecret: process.env.CRON_SECRET ?? "",
  cacheWarmupQueries:
    process.env.CACHE_WARMUP_QUERIES ?? "developer,software engineer",
  // Localization for the Google Jobs search (SerpApi google_jobs engine).
  // Defaults target the app's Brazilian, Portuguese-speaking audience.
  googleDomain: process.env.GOOGLE_DOMAIN ?? "google.com",
  googleCountry: process.env.GOOGLE_COUNTRY ?? "br",
  googleLanguage: process.env.GOOGLE_LANGUAGE ?? "pt-br",
};
