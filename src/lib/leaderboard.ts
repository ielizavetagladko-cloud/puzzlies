"use client";

import { useSyncExternalStore } from "react";

import type { DifficultyId } from "@/lib/points";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

/**
 * The leaderboard.
 *
 * Everything here goes through database functions rather than table reads:
 * other players' rows are private, and what a board needs is an aggregate, not
 * their rows. Nothing identifying comes back — no email, no user id, and no
 * name at all unless the player chose to set one.
 */

export type BoardRow = {
  place: number;
  /** A scrap of hash. Enough to tell two unnamed players apart, nothing more. */
  handle: string;
  displayName: string | null;
  solved: number;
  avgSeconds: number;
  isMe: boolean;
};

export type MyPlace = {
  place: number;
  solved: number;
  avgSeconds: number;
  total: number;
};

// ------------------------------------------------------------------ store

type BoardState = {
  difficulty: DifficultyId | null;
  loading: boolean;
  rows: BoardRow[];
  mine: MyPlace | null;
};

let state: BoardState = { difficulty: null, loading: true, rows: [], mine: null };
const listeners = new Set<() => void>();
const serverState: BoardState = { difficulty: null, loading: true, rows: [], mine: null };

function set(next: BoardState) {
  state = next;
  for (const listener of listeners) listener();
}

export function useLeaderboard(): BoardState {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => state,
    () => serverState,
  );
}

/** Loads one difficulty. A later request always wins over an earlier one. */
let pending = 0;

export async function loadLeaderboard(difficulty: DifficultyId) {
  const ticket = ++pending;
  set({ difficulty, loading: true, rows: [], mine: null });

  const [rows, mine] = await Promise.all([fetchBoard(difficulty), fetchMyPlace(difficulty)]);
  if (ticket !== pending) return;

  set({ difficulty, loading: false, rows, mine });
}

// ------------------------------------------------------------------ reads

export async function fetchBoard(difficulty: DifficultyId, limit = 20): Promise<BoardRow[]> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return [];

  const { data, error } = await supabase.rpc("leaderboard", {
    p_difficulty: difficulty,
    p_limit: limit,
  });
  if (error || !Array.isArray(data)) return [];

  return data.map((row) => ({
    place: Number(row.place),
    handle: row.handle as string,
    displayName: (row.display_name as string | null) || null,
    solved: Number(row.solved),
    avgSeconds: Number(row.avg_seconds),
    isMe: Boolean(row.is_me),
  }));
}

export async function fetchMyPlace(difficulty: DifficultyId): Promise<MyPlace | null> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return null;

  const { data, error } = await supabase.rpc("leaderboard_me", { p_difficulty: difficulty });
  const row = Array.isArray(data) ? data[0] : data;
  if (error || !row) return null;

  return {
    place: Number(row.place),
    solved: Number(row.solved),
    avgSeconds: Number(row.avg_seconds),
    total: Number(row.total),
  };
}

/** How many finished boards it takes to be ranked at all. */
export const RANKED_AFTER = 3;

// ---------------------------------------------------------- display name

let storedName: string | null = null;
let nameLoaded = false;
const nameListeners = new Set<() => void>();

function notifyName() {
  for (const listener of nameListeners) listener();
}

async function loadDisplayName() {
  if (nameLoaded) return;
  nameLoaded = true;

  const supabase = getSupabaseBrowserClient();
  if (!supabase) return;

  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return;

  const { data } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", auth.user.id)
    .maybeSingle();

  storedName = (data?.display_name as string | null) ?? null;
  notifyName();
}

/** The name already on the account, once it has been read. */
export function useStoredDisplayName(): string | null {
  return useSyncExternalStore(
    (listener) => {
      nameListeners.add(listener);
      void loadDisplayName();
      return () => nameListeners.delete(listener);
    },
    () => storedName,
    () => null,
  );
}

export async function saveDisplayName(name: string): Promise<boolean> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return false;

  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return false;

  // Only this column is writable by its owner; the rest of the profile is not.
  const trimmed = name.trim() || null;
  const { error } = await supabase
    .from("profiles")
    .update({ display_name: trimmed })
    .eq("id", auth.user.id);

  if (error) return false;

  storedName = trimmed;
  notifyName();
  return true;
}
