"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";

import type { Puzzle } from "@/data/catalog";
import { useAuth } from "@/lib/auth";
import { WELCOME_POINTS, computeReward, getDifficulty, type DifficultyId } from "@/lib/points";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type {
  CompleteResult,
  PointTransactionRow,
  ProgressRow,
  UnlockResult,
  UnlockRow,
} from "@/lib/supabase/types";

/**
 * Progress store.
 *
 * Two sources, one shape:
 *
 * - a guest plays against localStorage, exactly as before;
 * - a signed-in player plays against the database, where the balance is moved
 *   only by the SECURITY DEFINER functions in supabase/migrations. The browser
 *   reports *what* it finished, never *what it is worth*.
 *
 * Screens do not need to know which is which, apart from the two places where
 * an account genuinely behaves differently: purchases (waiting on a payment
 * provider) and resetting progress (a server-side operation we do not expose).
 */

const STORAGE_KEY = "puzzlies.progress.v1";

export type PointReason =
  | "complete"
  | "replay"
  | "unlock"
  | "welcome"
  | "guest"
  | "refund"
  | "purchase";

export type PointEntry = {
  id: string;
  delta: number;
  reason: PointReason;
  puzzleId?: string;
  at: number;
};

export type SolveRecord = {
  count: number;
  best: Partial<Record<DifficultyId, number>>;
};

export type GameState = {
  points: number;
  unlocked: string[];
  purchased: string[];
  solved: Record<string, SolveRecord>;
  totalSeconds: number;
  history: PointEntry[];
  lastPlayed?: { puzzleId: string; difficulty: DifficultyId; at: number };
};

export type ProgressSource = "guest" | "account";

const initialState: GameState = {
  points: WELCOME_POINTS,
  unlocked: [],
  purchased: [],
  solved: {},
  totalSeconds: 0,
  history: [{ id: "welcome", delta: WELCOME_POINTS, reason: "welcome", at: 0 }],
};

type Snapshot = { data: GameState; ready: boolean; source: ProgressSource };

const serverSnapshot: Snapshot = { data: initialState, ready: false, source: "guest" };
let snapshot: Snapshot = serverSnapshot;

/** Which account the snapshot belongs to; null while playing as a guest. */
let loadedFor: string | null | undefined = undefined;
/** Who the store is currently holding progress for, so it can be re-read. */
let currentUserId: string | null = null;

const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function set(next: Partial<Snapshot>) {
  snapshot = { ...snapshot, ...next };
  emit();
}

// ------------------------------------------------------------------- guest

function readLocal(): GameState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialState;
    return { ...initialState, ...(JSON.parse(raw) as Partial<GameState>) };
  } catch {
    return initialState;
  }
}

function writeLocal(state: GameState) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* private mode or quota — the session simply is not persisted */
  }
}

function updateLocal(next: (prev: GameState) => GameState) {
  const data = next(snapshot.data);
  writeLocal(data);
  set({ data, ready: true, source: "guest" });
}

function entryId() {
  return Math.random().toString(36).slice(2, 10);
}

function addEntry(state: GameState, entry: PointEntry) {
  return [entry, ...state.history].slice(0, 100);
}

// ----------------------------------------------------------------- account

function reasonOf(value: string): PointReason {
  return (
    ["complete", "replay", "unlock", "welcome", "guest", "refund", "purchase"] as const
  ).includes(value as PointReason)
    ? (value as PointReason)
    : "complete";
}

async function fetchAccountState(
  supabase: SupabaseClient,
  userId: string,
): Promise<GameState> {
  const [profile, unlocks, transactions, progress] = await Promise.all([
    supabase.from("profiles").select("points_balance").eq("id", userId).single(),
    supabase.from("user_unlocks").select("puzzle_id, method"),
    supabase
      .from("point_transactions")
      .select("id, delta, reason, puzzle_id, created_at")
      .order("created_at", { ascending: false })
      .limit(50),
    supabase.from("puzzle_progress").select("puzzle_id, difficulty, seconds, best_seconds, completed_count"),
  ]);

  const unlockRows = (unlocks.data ?? []) as Pick<UnlockRow, "puzzle_id" | "method">[];
  const progressRows = (progress.data ?? []) as Pick<
    ProgressRow,
    "puzzle_id" | "difficulty" | "seconds" | "best_seconds" | "completed_count"
  >[];

  const solved: Record<string, SolveRecord> = {};
  for (const row of progressRows) {
    if (row.best_seconds === null) continue;
    const record = (solved[row.puzzle_id] ??= { count: 0, best: {} });
    record.count += row.completed_count;
    record.best[row.difficulty] = row.best_seconds;
  }

  return {
    points: profile.data?.points_balance ?? 0,
    unlocked: unlockRows.filter((row) => row.method === "points").map((row) => row.puzzle_id),
    purchased: unlockRows.filter((row) => row.method === "purchase").map((row) => row.puzzle_id),
    solved,
    // The database keeps the last time per board rather than a running total,
    // so this under-counts replays. Good enough for a stat tile.
    totalSeconds: progressRows.reduce((sum, row) => sum + row.seconds, 0),
    history: ((transactions.data ?? []) as PointTransactionRow[]).map((row) => ({
      id: row.id,
      delta: row.delta,
      reason: reasonOf(row.reason),
      puzzleId: row.puzzle_id ?? undefined,
      at: Date.parse(row.created_at) || 0,
    })),
    lastPlayed: readLocal().lastPlayed,
  };
}

/**
 * Hands the guest's local progress to the account, once. The server caps what
 * it accepts, because these numbers come from the browser.
 */
async function claimGuestProgress(supabase: SupabaseClient, local: GameState) {
  const solved = Object.entries(local.solved).flatMap(([puzzleId, record]) =>
    Object.entries(record.best).map(([difficulty, seconds]) => ({
      puzzle_id: puzzleId,
      difficulty,
      seconds,
    })),
  );

  if (local.points <= WELCOME_POINTS && solved.length === 0) return;

  await supabase.rpc("claim_guest_progress", {
    p_points: Math.max(0, local.points - WELCOME_POINTS),
    p_solved: solved,
  });
}

async function loadForUser(userId: string | null) {
  if (loadedFor === userId && snapshot.ready) return;
  loadedFor = userId;

  const supabase = getSupabaseBrowserClient();

  if (!userId || !supabase) {
    set({ data: readLocal(), ready: true, source: "guest" });
    return;
  }

  set({ ready: false });
  try {
    // The welcome bonus is granted by the database, so anything above it was
    // earned as a guest and is worth carrying over.
    await claimGuestProgress(supabase, readLocal());
    set({ data: await fetchAccountState(supabase, userId), ready: true, source: "account" });
  } catch {
    // A failed load must not lock the player out of the game.
    set({ data: readLocal(), ready: true, source: "guest" });
  }
}

/**
 * Re-reads the balance from the database.
 *
 * Needed after money is spent or earned somewhere this store cannot see — a
 * payment finished on the provider's site, then the browser walked back into a
 * page it had cached, balance and all.
 */
export function reloadProgress() {
  loadedFor = undefined;
  void loadForUser(currentUserId);
}

// -------------------------------------------------------------------- hook

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return snapshot;
}

function getServerSnapshot() {
  return serverSnapshot;
}

type MutationResult = { ok: boolean; reason?: string };

export function useGame() {
  const { user, ready: authReady } = useAuth();
  const { data: state, ready, source } = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  const userId = user?.id ?? null;

  useEffect(() => {
    if (!authReady) return;
    currentUserId = userId;
    void loadForUser(userId);
  }, [authReady, userId]);

  const isUnlocked = useCallback(
    (puzzle: Puzzle) =>
      puzzle.access === "free" ||
      state.unlocked.includes(puzzle.id) ||
      state.purchased.includes(puzzle.id),
    [state.purchased, state.unlocked],
  );

  const unlockWithPoints = useCallback(async (puzzle: Puzzle): Promise<MutationResult> => {
    if (puzzle.access !== "points") return { ok: false, reason: "already" };

    const supabase = getSupabaseBrowserClient();
    if (snapshot.source === "account" && supabase) {
      const { data, error } = await supabase.rpc("unlock_with_points", {
        p_puzzle_id: puzzle.id,
      });
      const result = (Array.isArray(data) ? data[0] : data) as UnlockResult | null;
      if (error || !result?.ok) return { ok: false, reason: result?.reason ?? "failed" };

      set({
        data: {
          ...snapshot.data,
          points: result.balance ?? snapshot.data.points,
          unlocked: [...snapshot.data.unlocked, puzzle.id],
          history: addEntry(snapshot.data, {
            id: entryId(),
            delta: -(puzzle.pointsCost ?? 0),
            reason: "unlock",
            puzzleId: puzzle.id,
            at: Date.now(),
          }),
        },
      });
      return { ok: true };
    }

    const current = snapshot.data;
    const cost = puzzle.pointsCost ?? 0;
    if (current.unlocked.includes(puzzle.id)) return { ok: false, reason: "already" };
    if (current.points < cost) return { ok: false, reason: "not-enough" };

    updateLocal((prev) => ({
      ...prev,
      points: prev.points - cost,
      unlocked: [...prev.unlocked, puzzle.id],
      history: addEntry(prev, {
        id: entryId(),
        delta: -cost,
        reason: "unlock",
        puzzleId: puzzle.id,
        at: Date.now(),
      }),
    }));
    return { ok: true };
  }, []);

  const purchase = useCallback(async (puzzle: Puzzle): Promise<MutationResult> => {
    // With a real account there is nothing honest to do here yet: granting an
    // unlock without a payment would mean letting the browser hand out paid
    // pictures. It waits for Stripe.
    if (snapshot.source === "account") return { ok: false, reason: "not-available" };

    if (snapshot.data.purchased.includes(puzzle.id)) return { ok: false, reason: "already" };
    updateLocal((prev) => ({ ...prev, purchased: [...prev.purchased, puzzle.id] }));
    return { ok: true };
  }, []);

  const registerCompletion = useCallback(
    async (puzzleId: string, difficultyId: DifficultyId, seconds: number) => {
      const supabase = getSupabaseBrowserClient();

      if (snapshot.source === "account" && supabase) {
        const { data, error } = await supabase.rpc("complete_puzzle", {
          p_puzzle_id: puzzleId,
          p_difficulty: difficultyId,
          p_seconds: seconds,
        });
        const result = (Array.isArray(data) ? data[0] : data) as CompleteResult | null;

        if (!error && result) {
          const previous = snapshot.data.solved[puzzleId] ?? { count: 0, best: {} };
          set({
            data: {
              ...snapshot.data,
              points: result.balance,
              totalSeconds: snapshot.data.totalSeconds + seconds,
              solved: {
                ...snapshot.data.solved,
                [puzzleId]: {
                  count: previous.count + 1,
                  best: {
                    ...previous.best,
                    [difficultyId]: result.is_best ? seconds : previous.best[difficultyId],
                  },
                },
              },
              history: addEntry(snapshot.data, {
                id: entryId(),
                delta: result.earned,
                reason: result.first_time ? "complete" : "replay",
                puzzleId,
                at: Date.now(),
              }),
            },
          });
          return { earned: result.earned, firstTime: result.first_time, isBest: result.is_best };
        }
        // Fall through to the local calculation so a network blip still shows
        // the player something sensible on the win screen.
      }

      const difficulty = getDifficulty(difficultyId);
      const previousBest = snapshot.data.solved[puzzleId]?.best?.[difficultyId];
      const firstTime = previousBest === undefined;
      const isBest = firstTime || seconds < previousBest;
      const earned = computeReward(difficulty, seconds, firstTime);

      if (snapshot.source === "guest") {
        updateLocal((prev) => {
          const record = prev.solved[puzzleId] ?? { count: 0, best: {} };
          return {
            ...prev,
            points: prev.points + earned,
            totalSeconds: prev.totalSeconds + seconds,
            solved: {
              ...prev.solved,
              [puzzleId]: {
                count: record.count + 1,
                best: {
                  ...record.best,
                  [difficultyId]: isBest ? seconds : record.best[difficultyId],
                },
              },
            },
            history: addEntry(prev, {
              id: entryId(),
              delta: earned,
              reason: firstTime ? "complete" : "replay",
              puzzleId,
              at: Date.now(),
            }),
          };
        });
      }

      return { earned, firstTime, isBest };
    },
    [],
  );

  const rememberLastPlayed = useCallback((puzzleId: string, difficulty: DifficultyId) => {
    const lastPlayed = { puzzleId, difficulty, at: Date.now() };
    // Kept in the browser in both modes: it is a convenience, not a record.
    const local = readLocal();
    writeLocal({ ...local, lastPlayed });
    set({ data: { ...snapshot.data, lastPlayed } });
  }, []);

  const reset = useCallback(() => {
    if (snapshot.source === "account") return;
    updateLocal(() => initialState);
    try {
      Object.keys(window.localStorage)
        .filter((key) => key.startsWith("puzzlies.board."))
        .forEach((key) => window.localStorage.removeItem(key));
    } catch {
      /* ignore */
    }
  }, []);

  return useMemo(
    () => ({
      state,
      ready: ready && authReady,
      source,
      isUnlocked,
      unlockWithPoints,
      purchase,
      registerCompletion,
      rememberLastPlayed,
      reset,
    }),
    [
      authReady,
      isUnlocked,
      purchase,
      ready,
      registerCompletion,
      rememberLastPlayed,
      reset,
      source,
      state,
      unlockWithPoints,
    ],
  );
}
