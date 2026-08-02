import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import postgres from "postgres";

try {
  process.loadEnvFile(resolve(".env.local"));
} catch {
  // CI and Vercel inject variables directly; a local env file is optional.
}
const connectionString = (
  process.env.POSTGRES_URL_NON_POOLING
  || process.env.POSTGRES_URL
  || process.env.SUPABASE_DB_URL
  || process.env.DATABASE_URL
  || ""
).trim();

if (!connectionString) {
  throw new Error("Falta POSTGRES_URL_NON_POOLING o POSTGRES_URL para aplicar la migración.");
}

const migrationPath = resolve("supabase/migrations/20260802000000_archic_collaboration.sql");
const migration = await readFile(migrationPath, "utf8");
const sql = postgres(connectionString, {
  max: 1,
  connect_timeout: 15,
  idle_timeout: 5,
  ssl: "require",
});

try {
  await sql.begin(async (transaction) => {
    await transaction.unsafe(migration);
  });
  console.log("Archic Studio: esquema compartido y políticas aplicados.");
} finally {
  await sql.end({ timeout: 5 });
}
