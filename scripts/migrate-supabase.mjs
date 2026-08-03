import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
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

async function realtimeMessagesReady() {
  const [{ available }] = await sql.unsafe(
    "select to_regclass('realtime.messages') is not null as available",
  );
  return available;
}

async function initializeRealtime() {
  if (await realtimeMessagesReady()) return;

  const supabaseUrl = (
    process.env.NEXT_PUBLIC_SUPABASE_URL
    || process.env.SUPABASE_URL
    || ""
  ).trim();
  const publishableKey = (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    || process.env.SUPABASE_PUBLISHABLE_KEY
    || process.env.SUPABASE_ANON_KEY
    || ""
  ).trim();

  if (!supabaseUrl || !publishableKey) {
    throw new Error(
      "Realtime aún no está inicializado y faltan SUPABASE_URL o la clave pública para activarlo.",
    );
  }

  const supabase = createClient(supabaseUrl, publishableKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const channel = supabase.channel("archic-studio-migration-bootstrap");
  const status = await new Promise((resolveStatus) => {
    const timeout = setTimeout(() => resolveStatus("TIMED_OUT"), 25_000);
    channel.subscribe((nextStatus) => {
      if (["SUBSCRIBED", "CHANNEL_ERROR", "TIMED_OUT", "CLOSED"].includes(nextStatus)) {
        clearTimeout(timeout);
        resolveStatus(nextStatus);
      }
    });
  });
  await supabase.removeChannel(channel);

  if (status !== "SUBSCRIBED") {
    throw new Error(`Supabase Realtime no pudo inicializarse (${status}).`);
  }

  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (await realtimeMessagesReady()) return;
    await new Promise((resolveWait) => setTimeout(resolveWait, 500));
  }
  throw new Error("Supabase Realtime respondió, pero no terminó de crear realtime.messages.");
}

try {
  await initializeRealtime();
  await sql.begin(async (transaction) => {
    await transaction.unsafe(migration);
  });
  console.log("Archic Studio: esquema compartido y políticas aplicados.");
} finally {
  await sql.end({ timeout: 5 });
}
