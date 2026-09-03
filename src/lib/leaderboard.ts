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
  avatar: string | null;
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
    avatar: (row.avatar as string | null) || null,
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

export type Look = { name: string | null; avatar: string | null };

let look: Look = { name: null, avatar: null };
let nameLoaded = false;
const nameListeners = new Set<() => void>();

function notifyName() {
  for (const listener of nameListeners) listener();
}

const emptyLook: Look = { name: null, avatar: null };

async function loadLook() {
  if (nameLoaded) return;
  nameLoaded = true;

  const supabase = getSupabaseBrowserClient();
  if (!supabase) return;

  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return;

  const { data } = await supabase
    .from("profiles")
    .select("display_name, avatar")
    .eq("id", auth.user.id)
    .maybeSingle();

  look = {
    name: (data?.display_name as string | null) ?? null,
    avatar: (data?.avatar as string | null) ?? null,
  };
  notifyName();
}

/** How the account already presents itself, once it has been read. */
export function useLook(): Look {
  return useSyncExternalStore(
    (listener) => {
      nameListeners.add(listener);
      void loadLook();
      return () => nameListeners.delete(listener);
    },
    () => look,
    () => emptyLook,
  );
}

export async function saveLook(next: Partial<Look>): Promise<boolean> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return false;

  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return false;

  const patch: Record<string, string | null> = {};
  if (next.name !== undefined) patch.display_name = next.name?.trim() || null;
  if (next.avatar !== undefined) patch.avatar = next.avatar;

  // Only these two columns are writable by their owner; the balance is not.
  //
  // .select() matters here beyond returning the row: a row level security
  // policy that silently matches nothing is not an error to PostgREST, so an
  // update that touched zero rows would otherwise report success with nothing
  // saved. That exact gap once let a player type a name that never stuck.
  const { data, error } = await supabase
    .from("profiles")
    .update(patch)
    .eq("id", auth.user.id)
    .select("id");
  if (error || !data?.length) return false;

  look = { ...look, ...next, name: next.name === undefined ? look.name : next.name?.trim() || null };
  notifyName();
  return true;
}
