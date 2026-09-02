/**
 * The site's public address. Vercel sets VERCEL_PROJECT_PRODUCTION_URL for us,
 * but it can be overridden once a custom domain is in place — search engines
 * and social previews need absolute URLs, and they must point at one canonical
 * host rather than at whichever preview deployment rendered the page.
 */
const fromEnv =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL}`
    : undefined);

export const siteUrl = (fromEnv ?? "https://puzzlies.vercel.app").replace(/\/$/, "");

export function absolute(path: string) {
  return `${siteUrl}${path.startsWith("/") ? path : `/${path}`}`;
}
