/**
 * Supabase is optional at runtime. With no keys configured the site keeps
 * working exactly as it does today — guests play, progress lives in the
 * browser, sign-in stays in demo mode — so a missing key never takes the site
 * down, it only takes accounts away.
 */

export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
