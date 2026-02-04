import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "../shared/schema";

// Database is optional - app works without it (no history/auth)
let db: ReturnType<typeof drizzle> | null = null;

if (process.env.DATABASE_URL) {
  const sql = neon(process.env.DATABASE_URL);
  db = drizzle(sql, { schema });
  console.log("[DB] Connected to PostgreSQL");
} else {
  console.log("[DB] No DATABASE_URL set - running without database (history/auth disabled)");
}

export { db, schema };
