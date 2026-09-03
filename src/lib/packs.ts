import "server-only";

import { cache } from "react";

import { getSupabasePublicClient } from "@/lib/supabase/public";

export type PointPack = {
  id: string;
  points: number;
  /** In the smallest unit of `currency`: kopiyky for UAH, cents for USD. */
  priceMinorUnits: number;
  currency: string;
};

/** Shown when the database is unreachable, so the page is never blank. */
const fallbackPacks: PointPack[] = [
  { id: "small", points: 500, priceMinorUnits: 8900, currency: "UAH" },
  { id: "medium", points: 1500, priceMinorUnits: 21900, currency: "UAH" },
  { id: "large", points: 4000, priceMinorUnits: 51900, currency: "UAH" },
];

/**
 * Packs come from the database because that is where the checkout reads them
 * too — the price a browser displays never decides what it is charged.
 */
export const getPointPacks = cache(async (): Promise<PointPack[]> => {
  const supabase = getSupabasePublicClient();
  if (!supabase) return fallbackPacks;

  const { data, error } = await supabase
    .from("point_packs")
    .select("id, points, price_cents, currency")
    .eq("is_active", true)
    .order("sort_order");

  if (error || !data?.length) return fallbackPacks;

  return data.map((row) => ({
    id: row.id as string,
    points: row.points as number,
    priceMinorUnits: row.price_cents as number,
    currency: (row.currency as string) ?? "UAH",
  }));
});
