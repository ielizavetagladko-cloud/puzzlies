"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

import { isSupabaseConfigured, supabaseAnonKey, supabaseUrl } from "./config";

let cached: SupabaseClient | null = null;

/** Returns null when the project is not configured yet — callers fall back to guest mode. */
export function getSupabaseBrowserClient(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  cached ??= createBrowserClient(supabaseUrl, supabaseAnonKey);
  return cached;
}
