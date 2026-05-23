import dotenv from "dotenv";
import fs from "fs";
import path from "path";

const envCandidates = [
  path.resolve(process.cwd(), ".env"),
  path.resolve(__dirname, "../../.env"),
  path.resolve(__dirname, "../../../.env"),
];

const envPath = envCandidates.find((candidate) => fs.existsSync(candidate));
const hadDatabaseUrl = Boolean(process.env.DATABASE_URL);
const result = dotenv.config({ path: envPath, quiet: true });

const getDatabaseUrlMetadata = (value: string | undefined): string => {
  if (!value) return "missing";

  try {
    const url = new URL(value);
    const database = url.pathname.replace(/^\//, "") || "unknown";
    return `present host=${url.hostname} database=${database} sslmode=${url.searchParams.get("sslmode") ?? "not-set"}`;
  } catch {
    return "present but invalid URL format";
  }
};

const databaseUrlSource = hadDatabaseUrl
  ? "process environment"
  : result.parsed?.DATABASE_URL
    ? ".env"
    : "missing";

console.log(`[env] .env path: ${envPath ? path.relative(process.cwd(), envPath) || ".env" : "not found"}`);
console.log(`[env] DATABASE_URL source: ${databaseUrlSource}`);
console.log(`[env] DATABASE_URL: ${getDatabaseUrlMetadata(process.env.DATABASE_URL)}`);
