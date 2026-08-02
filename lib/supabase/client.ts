"use client";

import { createBrowserClient } from "@supabase/ssr";
import { requireSupabasePublicConfig } from "./config";

let browserClient: ReturnType<typeof createBrowserClient> | null = null;

export function getBrowserSupabase() {
  if (!browserClient) {
    const { url, key } = requireSupabasePublicConfig();
    browserClient = createBrowserClient(url, key);
  }
  return browserClient;
}
