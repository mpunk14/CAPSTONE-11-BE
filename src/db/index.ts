import { drizzle } from "drizzle-orm/postgres-js";
import "dotenv/config";
import postgres from "postgres";
import * as schema from "./skema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.warn("DATABASE_URL is missing. Database queries will use postgres-js default connection settings.");
}

const client = connectionString ? postgres(connectionString) : postgres();

export const db = drizzle(client, { schema });
