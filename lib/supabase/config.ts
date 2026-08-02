export type SupabasePublicConfig = {
  url: string;
  key: string;
};

export function getSupabasePublicConfig(): SupabasePublicConfig | null {
  const url = (
    process.env.NEXT_PUBLIC_SUPABASE_URL
    || process.env.SUPABASE_URL
    || ""
  ).trim();
  const key = (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    || process.env.SUPABASE_ANON_KEY
    || ""
  ).trim();

  return url && key ? { url, key } : null;
}

export function requireSupabasePublicConfig(): SupabasePublicConfig {
  const config = getSupabasePublicConfig();
  if (!config) {
    throw new Error(
      "Archic Studio todavía no tiene Supabase conectado. Faltan la URL y la clave pública del proyecto.",
    );
  }
  return config;
}

export function getSupabaseServiceRoleKey(): string {
  const key = (
    process.env.SUPABASE_SECRET_KEY
    || process.env.SUPABASE_SERVICE_ROLE_KEY
    || ""
  ).trim();
  if (!key) {
    throw new Error(
      "Falta SUPABASE_SECRET_KEY o SUPABASE_SERVICE_ROLE_KEY. La administración de las dos cuentas está desactivada.",
    );
  }
  return key;
}
