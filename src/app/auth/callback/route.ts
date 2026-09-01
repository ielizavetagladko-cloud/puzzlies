import { NextResponse, type NextRequest } from "next/server";

import { defaultLocale, locales } from "@/i18n/config";
import { getSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Where magic links and OAuth providers land. Exchanges the one-time code for a
 * session cookie and sends the player back to the page they started from.
 *
 * This route sits outside the [lang] segment on purpose: the address has to be
 * fixed, because it is registered in the Supabase dashboard.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "";

  // Only ever redirect within this site, and only to a real locale.
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "";
  const localeFromNext = locales.find(
    (locale) => safeNext === `/${locale}` || safeNext.startsWith(`/${locale}/`),
  );
  const destination = localeFromNext ? safeNext : `/${defaultLocale}`;

  if (!code) {
    return NextResponse.redirect(`${origin}${destination}?auth=missing-code`);
  }

  const supabase = await getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.redirect(`${origin}${destination}?auth=not-configured`);
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(`${origin}${destination}?auth=failed`);
  }

  return NextResponse.redirect(`${origin}${destination}`);
}
