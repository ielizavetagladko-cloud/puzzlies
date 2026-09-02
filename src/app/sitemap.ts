import type { MetadataRoute } from "next";

import { defaultLocale, locales } from "@/i18n/config";
import { getCatalogue } from "@/lib/catalogue";
import { absolute } from "@/lib/site";

/**
 * Every public page in both languages, with each entry pointing at its
 * translation so Google serves the right one rather than treating the two as
 * duplicates of each other.
 */
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { categories, puzzles } = await getCatalogue();
  const paths: { path: string; priority: number }[] = [
    { path: "", priority: 1 },
    ...categories.map((category) => ({
      path: `/category/${category.slug}`,
      priority: 0.8,
    })),
    ...puzzles.map((puzzle) => ({ path: `/puzzle/${puzzle.id}`, priority: 0.6 })),
    { path: "/signin", priority: 0.3 },
    { path: "/privacy", priority: 0.2 },
    { path: "/terms", priority: 0.2 },
  ];

  const lastModified = new Date();

  return paths.map(({ path, priority }) => ({
    url: absolute(`/${defaultLocale}${path}`),
    lastModified,
    changeFrequency: "weekly",
    priority,
    alternates: {
      languages: Object.fromEntries(
        locales.map((locale) => [locale, absolute(`/${locale}${path}`)]),
      ),
    },
  }));
}
