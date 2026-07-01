import { eq, desc, and, like, inArray, gte, lte, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, InsertJob, jobs } from "../drizzle/schema";
import { ENV } from "./_core/env";
import { tokenizeLocationFilter } from "./locationFilter";

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db
    .select()
    .from(users)
    .where(eq(users.openId, openId))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

/**
 * Inserir ou atualizar uma vaga no banco de dados
 */
export async function upsertJob(job: InsertJob): Promise<void> {
  if (!job.jobId) {
    throw new Error("Job jobId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert job: database not available");
    return;
  }

  try {
    await db
      .insert(jobs)
      .values(job)
      .onDuplicateKeyUpdate({
        set: {
          title: job.title,
          companyName: job.companyName,
          location: job.location,
          description: job.description,
          jobType: job.jobType,
          salary: job.salary,
          shareLink: job.shareLink,
          thumbnail: job.thumbnail,
          via: job.via,
          postedAt: job.postedAt,
          updatedAt: new Date(),
        },
      });
  } catch (error) {
    console.error("[Database] Failed to upsert job:", error);
    throw error;
  }
}

/**
 * Buscar vagas com filtros
 */
export async function searchJobsInDb(
  query?: string,
  filters?: {
    location?: string;
    jobType?: string[];
    company?: string;
    dateRange?: "1h" | "24h" | "72h";
  }
) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot search jobs: database not available");
    return [];
  }

  try {
    const whereConditions: any[] = [];

    // Filtro por palavra-chave
    if (query) {
      whereConditions.push(
        or(like(jobs.title, `%${query}%`), like(jobs.description, `%${query}%`))
      );
    }

    // Filtro por tipo de vaga
    if (filters?.jobType && filters.jobType.length > 0) {
      whereConditions.push(inArray(jobs.jobType, filters.jobType));
    }

    // Filtro por empresa
    if (filters?.company) {
      whereConditions.push(like(jobs.companyName, `%${filters.company}%`));
    }

    // Filtro por localização. Usamos um casamento tolerante: a vaga bate
    // se o campo location contiver qualquer um dos termos digitados
    // (cidade, estado OU país), já que o texto retornado pela API costuma
    // trazer só cidade/estado, sem o país.
    const locationTokens = tokenizeLocationFilter(filters?.location);
    if (locationTokens.length > 0) {
      whereConditions.push(
        or(...locationTokens.map(token => like(jobs.location, `%${token}%`)))
      );
    }

    // Filtro por data de publicação da vaga.
    // Usamos a data real de publicação (postedAt), calculada a partir do
    // texto retornado pela Google Jobs API (ex: "3 days ago"). Quando não
    // é possível determinar essa data, usamos a data de entrada no cache
    // (createdAt) como aproximação.
    if (filters?.dateRange) {
      const now = new Date();
      let startDate = new Date();

      if (filters.dateRange === "1h") {
        startDate.setHours(startDate.getHours() - 1);
      } else if (filters.dateRange === "24h") {
        startDate.setDate(startDate.getDate() - 1);
      } else if (filters.dateRange === "72h") {
        startDate.setDate(startDate.getDate() - 3);
      }

      const effectiveDate = sql`COALESCE(${jobs.postedAt}, ${jobs.createdAt})`;
      whereConditions.push(
        and(gte(effectiveDate, startDate), lte(effectiveDate, now))
      );
    }

    const conditions =
      whereConditions.length > 0 ? and(...whereConditions) : undefined;

    const result = await db
      .select()
      .from(jobs)
      .where(conditions)
      .orderBy(desc(jobs.createdAt))
      .limit(100);

    return result;
  } catch (error) {
    console.error("[Database] Failed to search jobs:", error);
    throw error;
  }
}

export async function getLatestJobsUpdatedAt(): Promise<Date | null> {
  const db = await getDb();
  if (!db) {
    return null;
  }

  try {
    const result = await db
      .select({ latest: sql<Date | null>`max(${jobs.updatedAt})` })
      .from(jobs);

    return result[0]?.latest ?? null;
  } catch (error) {
    console.error(
      "[Database] Failed to get latest jobs update timestamp:",
      error
    );
    return null;
  }
}

/**
 * Obter uma vaga específica pelo jobId
 */
export async function getJobById(jobId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get job: database not available");
    return undefined;
  }

  try {
    const result = await db
      .select()
      .from(jobs)
      .where(eq(jobs.jobId, jobId))
      .limit(1);

    return result.length > 0 ? result[0] : undefined;
  } catch (error) {
    console.error("[Database] Failed to get job:", error);
    throw error;
  }
}
