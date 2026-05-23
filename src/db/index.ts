import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import "../config/loadEnv";
import * as schema from "./skema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.warn("DATABASE_URL is missing. Database queries will use postgres-js default connection settings.");
} else {
  try {
    const url = new URL(connectionString);
    const database = url.pathname.replace(/^\//, "") || "unknown";
    console.log(`[db] Connecting with DATABASE_URL host=${url.hostname} database=${database}`);
  } catch {
    console.warn("[db] DATABASE_URL is present but is not a valid URL.");
  }
}

const client = connectionString
  ? postgres(connectionString, { max: 3 })
  : postgres({ max: 3 });

export const db = drizzle(client, { schema });
