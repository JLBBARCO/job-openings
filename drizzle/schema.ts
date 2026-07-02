import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal, index } from "drizzle-orm/mysql-core";
import { relations } from "drizzle-orm";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Tabela de vagas de emprego armazenadas em cache
 * Armazena vagas obtidas da SerpApi para melhorar performance
 */
export const jobs = mysqlTable(
  "jobs",
  {
    id: int("id").autoincrement().primaryKey(),
    /** ID único da vaga fornecido pela SerpApi */
    jobId: varchar("jobId", { length: 255 }).notNull().unique(),
    /** Título da vaga */
    title: text("title").notNull(),
    /** Nome da empresa */
    companyName: text("companyName").notNull(),
    /** Localização da vaga */
    location: text("location"),
    /** Descrição da vaga */
    description: text("description"),
    /** Tipo de vaga (CLT, PJ, Estágio, Freelance, etc) */
    jobType: varchar("jobType", { length: 100 }),
    /** Modalidade de trabalho (Presencial, Híbrido, Remoto) */
    workMode: varchar("workMode", { length: 20 }),
    /** Salário (em formato texto para flexibilidade) */
    salary: varchar("salary", { length: 100 }),
    /** Link para a vaga */
    shareLink: text("shareLink"),
    /** URL da logo da empresa */
    thumbnail: text("thumbnail"),
    /** Fonte da vaga (LinkedIn, Indeed, etc) */
    via: varchar("via", { length: 100 }),
    /** Data de publicação da vaga */
    postedAt: timestamp("postedAt"),
    /** Dados brutos da vaga em JSON */
    rawData: text("rawData"),
    /** Data de criação do registro */
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    /** Data de atualização do registro */
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    jobIdIndex: index("jobId_idx").on(table.jobId),
    companyNameIndex: index("companyName_idx").on(table.companyName),
    jobTypeIndex: index("jobType_idx").on(table.jobType),
    workModeIndex: index("workMode_idx").on(table.workMode),
    createdAtIndex: index("createdAt_idx").on(table.createdAt),
  })
);

export type Job = typeof jobs.$inferSelect;
export type InsertJob = typeof jobs.$inferInsert;

/**
 * Tabela de histórico de buscas do usuário
 * Armazena buscas anteriores para facilitar retorno ao contexto
 */
export const searchHistory = mysqlTable(
  "searchHistory",
  {
    id: int("id").autoincrement().primaryKey(),
    /** ID do usuário que realizou a busca */
    userId: int("userId").notNull(),
    /** Termo de busca */
    query: text("query"),
    /** Filtros aplicados em JSON */
    filters: text("filters"),
    /** Data da busca */
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    userIdIndex: index("userId_idx").on(table.userId),
  })
);

export type SearchHistory = typeof searchHistory.$inferSelect;
export type InsertSearchHistory = typeof searchHistory.$inferInsert;