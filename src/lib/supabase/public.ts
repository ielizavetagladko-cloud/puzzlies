import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { isSupabaseConfigured, supabaseAnonKey, supabaseUrl } from "./config";

let cached: SupabaseClient | null = null;

/**
 * Client for public, signed-out reads: the catalogue.
 *
 * Deliberately has no session and touches no cookies, because it also runs at
 * build time inside `generateStaticParams`, where there is no request to read
 * cookies from. Row level security still applies — this key may only read the
 * catalogue tables.
 */
export function getSupabasePublicClient(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  cached ??= createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}
