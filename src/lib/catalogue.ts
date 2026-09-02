import "server-only";

import { cache } from "react";

import fallback from "@/data/catalog.json";
import type { Accent, AccessType, Category, Puzzle } from "@/data/catalog";
import { getSupabasePublicClient } from "@/lib/supabase/public";
import type { CategoryRow, PuzzleRow } from "@/lib/supabase/types";

export type Catalogue = { categories: Category[]; puzzles: Puzzle[] };

/**
 * The catalogue comes from the database, so a picture added through
 * scripts/images.mjs appears without a deploy.
 *
 * src/data/catalog.json stays as the fallback: it is what the site shows if
 * Supabase is unconfigured or unreachable, which keeps a database hiccup from
 * turning into an empty site.
 */

function fromRows(categories: CategoryRow[], puzzles: PuzzleRow[]): Catalogue {
  return {
    categories: categories.map((row) => ({
      id: row.id,
      slug: row.id,
      title: { uk: row.title_uk, en: row.title_en },
      blurb: { uk: row.blurb_uk, en: row.blurb_en },
      icon: row.icon,
      accent: row.accent as Accent,
    })),
    puzzles: puzzles.map((row) => ({
      id: row.id,
      categoryId: row.category_id,
      title: { uk: row.title_uk, en: row.title_en },
      image: row.image,
      width: row.width,
      height: row.height,
      access: row.access as AccessType,
      ...(row.points_cost !== null ? { pointsCost: row.points_cost } : null),
      ...(row.price_cents !== null ? { priceCents: row.price_cents } : null),
      license: row.license,
    })),
  };
}

const fallbackCatalogue: Catalogue = fallback as Catalogue;

/** Cached per request, so one page render never asks the database twice. */
export const getCatalogue = cache(async (): Promise<Catalogue> => {
  // A cookie-free client on purpose: this also runs during the build, inside
  // generateStaticParams, where there is no request to read cookies from.
  const supabase = getSupabasePublicClient();
  if (!supabase) return fallbackCatalogue;

  try {
    const [categories, puzzles] = await Promise.all([
      supabase.from("categories").select("*").order("sort_order"),
      supabase.from("puzzles").select("*").eq("is_active", true).order("sort_order"),
    ]);

    if (categories.error || puzzles.error) return fallbackCatalogue;
    if (!categories.data?.length || !puzzles.data?.length) return fallbackCatalogue;

    return fromRows(categories.data as CategoryRow[], puzzles.data as PuzzleRow[]);
  } catch {
    return fallbackCatalogue;
  }
});

export async function getCategoryBySlug(slug: string) {
  const { categories } = await getCatalogue();
  return categories.find((category) => category.slug === slug);
}

export async function getPuzzleById(id: string) {
  const { puzzles } = await getCatalogue();
  return puzzles.find((puzzle) => puzzle.id === id);
}

export async function getPuzzlesOf(categoryId: string) {
  const { puzzles } = await getCatalogue();
  return puzzles.filter((puzzle) => puzzle.categoryId === categoryId);
}
