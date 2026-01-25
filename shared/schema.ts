import { z } from "zod";
import { pgTable, text, uuid, timestamp, integer, jsonb } from "drizzle-orm/pg-core";

// ============================================================================
// DATABASE TABLES (Drizzle ORM)
// ============================================================================

// Users table
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").unique().notNull(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Search history table
export const searchHistory = pgTable("search_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id),
  sessionId: text("session_id"), // For anonymous users
  topic: text("topic").notNull(),
  keywords: text("keywords"),
  timeframeDays: integer("timeframe_days").notNull(),
  paperCount: integer("paper_count"),
  articleCount: integer("article_count"),
  executiveSummary: jsonb("executive_summary"),
  results: jsonb("results"), // Full results for history replay
  createdAt: timestamp("created_at").defaultNow(),
});

// Sessions table (for express-session with connect-pg-simple)
export const sessions = pgTable("sessions", {
  sid: text("sid").primaryKey(),
  sess: jsonb("sess").notNull(),
  expire: timestamp("expire").notNull(),
});

// ============================================================================
// ZOD SCHEMAS (Validation)
// ============================================================================

// Search Request Schema (updated - removed subdomain)
export const searchRequestSchema = z.object({
  topic: z.string().min(1, "Topic is required"),
  keywords: z.string().optional(),
  timeframeDays: z.number().min(1).max(30).optional().default(7),
});

// Paper Summary Schema (new structured format)
export const paperSummarySchema = z.object({
  id: z.string(),
  title: z.string(),
  authors: z.string(),
  arxivUrl: z.string(),
  publishedDate: z.string(),
  abstract: z.string(),
  categories: z.array(z.string()),
  summary: z.object({
    problemStatement: z.string(),  // What problem does the paper target?
    proposedSolution: z.string(),  // What solution does it propose?
    challenges: z.string(),        // What challenges does it acknowledge?
  }),
});

// Article Schema (from Tavily)
export const articleSchema = z.object({
  id: z.string(),
  title: z.string(),
  url: z.string(),
  source: z.string(), // Domain/publication name
  publishedDate: z.string().optional(),
  content: z.string().optional(), // Raw content for summarization
});

// Digest Response Schema (new format with executive summaries)
export const digestResponseSchema = z.object({
  topic: z.string(),
  timeframeDays: z.number(),
  generatedAt: z.string(),

  // Papers section
  papers: z.object({
    executiveSummary: z.string(),  // AI overview of all papers
    count: z.number(),
    items: z.array(paperSummarySchema),
  }),

  // Articles section
  articles: z.object({
    executiveSummary: z.string(),  // AI overview of all articles
    count: z.number(),
    items: z.array(z.object({
      id: z.string(),
      title: z.string(),
      url: z.string(),
      source: z.string(),
      publishedDate: z.string().optional(),
    })),
  }),

  warning: z.string().optional(),
});

// User schema for auth
export const userSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  createdAt: z.string(),
});

// Auth schemas
export const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

// History item schema
export const historyItemSchema = z.object({
  id: z.string().uuid(),
  topic: z.string(),
  keywords: z.string().nullable(),
  timeframeDays: z.number(),
  paperCount: z.number().nullable(),
  articleCount: z.number().nullable(),
  createdAt: z.string(),
});

// Type exports
export type SearchRequest = z.infer<typeof searchRequestSchema>;
export type PaperSummary = z.infer<typeof paperSummarySchema>;
export type Article = z.infer<typeof articleSchema>;
export type DigestResponse = z.infer<typeof digestResponseSchema>;
export type User = z.infer<typeof userSchema>;
export type RegisterRequest = z.infer<typeof registerSchema>;
export type LoginRequest = z.infer<typeof loginSchema>;
export type HistoryItem = z.infer<typeof historyItemSchema>;
