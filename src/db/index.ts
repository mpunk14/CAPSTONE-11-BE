import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./skema"; // Udah disesuaikan pakai skema.ts
import "dotenv/config";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Export 'db' biar bisa di-import sama controller kamu
export const db = drizzle(pool, { schema });