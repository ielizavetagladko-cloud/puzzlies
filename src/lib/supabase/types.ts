/**
 * Hand-written shapes for the rows this app reads. Once the project exists,
 * `supabase gen types typescript` can replace this file with generated types.
 */

import type { DifficultyId } from "@/lib/points";

export type AccessType = "free" | "points" | "paid";

export type CategoryRow = {
  id: string;
  title_uk: string;
  title_en: string;
  blurb_uk: string;
  blurb_en: string;
  icon: string;
  accent: string;
  sort_order: number;
};

export type PuzzleRow = {
  id: string;
  category_id: string;
  title_uk: string;
  title_en: string;
  image: string;
  width: number;
  height: number;
  access: AccessType;
  points_cost: number | null;
  price_cents: number | null;
  license: string;
  sort_order: number;
  is_active: boolean;
};

export type ProfileRow = {
  id: string;
  display_name: string | null;
  points_balance: number;
  created_at: string;
};

export type PointTransactionRow = {
  id: string;
  user_id: string;
  delta: number;
  reason: "welcome" | "complete" | "replay" | "unlock" | "refund";
  puzzle_id: string | null;
  created_at: string;
};

export type UnlockRow = {
  user_id: string;
  puzzle_id: string;
  method: "points" | "purchase";
  created_at: string;
};

export type ProgressRow = {
  user_id: string;
  puzzle_id: string;
  difficulty: DifficultyId;
  state: unknown;
  seconds: number;
  best_seconds: number | null;
  completed_count: number;
  updated_at: string;
};

/** Return shape of the `complete_puzzle` database function. */
export type CompleteResult = {
  earned: number;
  first_time: boolean;
  is_best: boolean;
  balance: number;
};

/** Return shape of the `unlock_with_points` database function. */
export type UnlockResult = {
  ok: boolean;
  reason: string | null;
  balance: number | null;
};
