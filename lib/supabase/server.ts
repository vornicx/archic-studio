import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import {
  getSupabaseServiceRoleKey,
  requireSupabasePublicConfig,
} from "./config";

export async function createServerSupabase() {
  const cookieStore = await cookies();
  const { url, key } = requireSupabasePublicConfig();

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(values) {
        try {
          for (const { name, value, options } of values) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // A Server Component cannot always write cookies. proxy.ts refreshes
          // the session on requests where a write is needed.
        }
      },
    },
  });
}
export function createAdminSupabase() {
  const { url } = requireSupabasePublicConfig();
  return createClient(url, getSupabaseServiceRoleKey(), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
