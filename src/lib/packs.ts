import "server-only";

import { cache } from "react";

import { getSupabasePublicClient } from "@/lib/supabase/public";

export type PointPack = {
  id: string;
  points: number;
  priceCents: number;
};

/** Shown when the database is unreachable, so the page is never blank. */
const fallbackPacks: PointPack[] = [
  { id: "small", points: 500, priceCents: 200 },
  { id: "medium", points: 1500, priceCents: 500 },
  { id: "large", points: 4000, priceCents: 1200 },
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
    .select("id, points, price_cents")
    .eq("is_active", true)
    .order("sort_order");

  if (error || !data?.length) return fallbackPacks;

  return data.map((row) => ({
    id: row.id as string,
    points: row.points as number,
    priceCents: row.price_cents as number,
  }));
});
