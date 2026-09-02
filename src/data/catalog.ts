import catalog from "./catalog.json";
import type { Localized } from "@/i18n/config";

/**
 * The catalogue lives in catalog.json so that scripts/images.mjs can add
 * pictures to it without rewriting TypeScript. This file gives that data its
 * types and the lookups the app uses.
 *
 * The same data is mirrored into Supabase by supabase/seed.sql, which is
 * generated from here — the database needs it for the scoring functions, which
 * must never take a puzzle's price from the browser.
 */

export type AccessType = "free" | "points" | "paid";

export type Accent = "mint" | "sky" | "lilac" | "peach" | "blush";

export type Category = {
  id: string;
  slug: string;
  title: Localized;
  blurb: Localized;
  icon: string;
  accent: Accent;
};

export type Puzzle = {
  id: string;
  categoryId: string;
  title: Localized;
  image: string;
  /** Intrinsic size of the file in /public — used to keep aspect ratio. */
  width: number;
  height: number;
  access: AccessType;
  /** Only for access === "points". */
  pointsCost?: number;
  /** Only for access === "paid". */
  priceCents?: number;
  /** Where the picture came from: "own", "generated", "public-domain", "demo". */
  license?: string;
};

export const PAID_PRICE_CENTS = 125;

export const categories = catalog.categories as Category[];
export const puzzles = catalog.puzzles as Puzzle[];

export function getCategory(slug: string) {
  return categories.find((category) => category.slug === slug);
}

export function getPuzzle(id: string) {
  return puzzles.find((puzzle) => puzzle.id === id);
}

export function puzzlesOf(categoryId: string) {
  return puzzles.filter((puzzle) => puzzle.categoryId === categoryId);
}

/** Next puzzle in the same category, wrapping around. */
export function nextPuzzle(current: Puzzle) {
  const list = puzzlesOf(current.categoryId);
  const index = list.findIndex((puzzle) => puzzle.id === current.id);
  return list[(index + 1) % list.length];
}

export const accentClasses: Record<Accent, { bg: string; text: string; ring: string }> = {
  mint: { bg: "bg-mint", text: "text-mint-ink", ring: "ring-mint" },
  sky: { bg: "bg-sky", text: "text-sky-ink", ring: "ring-sky" },
  lilac: { bg: "bg-lilac", text: "text-lilac-ink", ring: "ring-lilac" },
  peach: { bg: "bg-peach", text: "text-peach-ink", ring: "ring-peach" },
  blush: { bg: "bg-blush", text: "text-blush-ink", ring: "ring-blush" },
};
