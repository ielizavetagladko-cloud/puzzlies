import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { defaultLocale, locales } from "@/i18n/config";
import { isSupabaseConfigured, supabaseAnonKey, supabaseUrl } from "@/lib/supabase/config";

const PUBLIC_FILE = /\.[^/]+$/;

function pickLocale(request: NextRequest) {
  const cookie = request.cookies.get("lang")?.value;
  if (cookie && (locales as readonly string[]).includes(cookie)) return cookie;

  const header = request.headers.get("accept-language") ?? "";
  const preferred = header
    .split(",")
    .map((part) => part.split(";")[0].trim().toLowerCase())
    .find((tag) => locales.some((l) => tag === l || tag.startsWith(`${l}-`)));

  if (preferred) {
    return locales.find((l) => preferred === l || preferred.startsWith(`${l}-`)) ?? defaultLocale;
  }
  // Russian speakers get the Ukrainian UI, everyone else English.
  if (header.toLowerCase().includes("ru")) return "uk";
  return defaultLocale;
}

/**
 * Keeps the auth session alive. Access tokens are short lived, so without this
 * refresh a returning player would look signed out to the server on their next
 * page load. Cookies are written onto the very response we are about to send,
 * redirect included.
 */
async function refreshSession(request: NextRequest, response: NextResponse) {
  if (!isSupabaseConfigured) return;

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  try {
    await supabase.auth.getUser();
  } catch {
    // A failed refresh must never block the page — the visitor simply stays a guest.
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/api") || PUBLIC_FILE.test(pathname)) return;

  const hasLocale = locales.some(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`),
  );

  // The auth callback address is registered with Supabase and must not move.
  const keepAsIs = hasLocale || pathname.startsWith("/auth");

  let response: NextResponse;
  if (keepAsIs) {
    response = NextResponse.next({ request });
  } else {
    const url = request.nextUrl.clone();
    url.pathname = `/${pickLocale(request)}${pathname === "/" ? "" : pathname}`;
    response = NextResponse.redirect(url);
  }

  await refreshSession(request, response);
  return response;
}

export const config = {
  matcher: ["/((?!_next|api|.*\\..*).*)"],
};
