import express, { type Express } from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { registerJobsCacheCronRoute } from "./jobsCacheScheduler";

export function createApiApp(): Express {
  const app = express();

  // Body size is increased because image generation and rich payloads are allowed.
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  registerStorageProxy(app);
  registerOAuthRoutes(app);
  registerJobsCacheCronRoute(app);

  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  app.use(
    (
      err: unknown,
      req: express.Request,
      res: express.Response,
      _next: express.NextFunction
    ) => {
      if (!req.path.startsWith("/api")) {
        return res.status(500).send("Internal Server Error");
      }

      const message =
        err instanceof Error ? err.message : "Unexpected server error";
      console.error("[API] Unhandled error:", err);
      return res.status(500).json({
        error: {
          message,
        },
      });
    }
  );

  return app;
}
