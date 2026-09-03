import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { isSupabaseConfigured, supabaseUrl } from "./config";

let cached: SupabaseClient | null = null;

/**
 * The trusted server client. Bypasses row level security, so it exists only for
 * work no browser may ever do — today, crediting a paid order.
 *
 * The key is read from a plain environment variable, never a NEXT_PUBLIC_ one,
 * so it cannot end up in the bundle sent to the browser.
 */
export function getSupabaseAdminClient(): SupabaseClient | null {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!isSupabaseConfigured || !key) return null;

  cached ??= createClient(supabaseUrl, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}
