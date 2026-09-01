import { NextResponse, type NextRequest } from "next/server";

import { defaultLocale, locales } from "@/i18n/config";

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

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/api") || PUBLIC_FILE.test(pathname)) return;

  const hasLocale = locales.some(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`),
  );
  if (hasLocale) return;

  const locale = pickLocale(request);
  const url = request.nextUrl.clone();
  url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next|api|.*\\..*).*)"],
};
