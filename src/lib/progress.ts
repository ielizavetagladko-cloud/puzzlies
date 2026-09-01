"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

import type { Puzzle } from "@/data/catalog";
import { WELCOME_POINTS, computeReward, getDifficulty, type DifficultyId } from "@/lib/points";

/**
 * Local progress store.
 *
 * State lives in localStorage and is exposed through `useSyncExternalStore`, so
 * server rendering sees the neutral starting state and the browser swaps in the
 * saved one right after hydration.
 *
 * The mutating methods are async on purpose: when Supabase + auth land, only
 * their bodies change — callers stay the same.
 */

const STORAGE_KEY = "puzzlies.progress.v1";

export type PointReason = "complete" | "replay" | "unlock" | "welcome";

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

const initialState: GameState = {
  points: WELCOME_POINTS,
  unlocked: [],
  purchased: [],
  solved: {},
  totalSeconds: 0,
  history: [{ id: "welcome", delta: WELCOME_POINTS, reason: "welcome", at: 0 }],
};

type Snapshot = { data: GameState; ready: boolean };

const serverSnapshot: Snapshot = { data: initialState, ready: false };
let snapshot: Snapshot = serverSnapshot;

const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function readState(): GameState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialState;
    return { ...initialState, ...(JSON.parse(raw) as Partial<GameState>) };
  } catch {
    return initialState;
  }
}

function writeState(state: GameState) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* private mode or quota — the session simply is not persisted */
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!snapshot.ready && typeof window !== "undefined") {
    snapshot = { data: readState(), ready: true };
    queueMicrotask(emit);
  }
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

function update(next: (prev: GameState) => GameState) {
  const data = next(snapshot.data);
  snapshot = { data, ready: true };
  writeState(data);
  emit();
}

function entryId() {
  return Math.random().toString(36).slice(2, 10);
}

function addEntry(state: GameState, entry: PointEntry) {
  return [entry, ...state.history].slice(0, 100);
}

type UnlockResult = { ok: boolean; reason?: "not-enough" | "already" };

export function useGame() {
  const { data: state, ready } = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  const isUnlocked = useCallback(
    (puzzle: Puzzle) =>
      puzzle.access === "free" ||
      state.unlocked.includes(puzzle.id) ||
      state.purchased.includes(puzzle.id),
    [state.purchased, state.unlocked],
  );

  const unlockWithPoints = useCallback(async (puzzle: Puzzle): Promise<UnlockResult> => {
    const current = snapshot.data;
    if (puzzle.access !== "points") return { ok: false, reason: "already" };
    if (current.unlocked.includes(puzzle.id)) return { ok: false, reason: "already" };

    const cost = puzzle.pointsCost ?? 0;
    if (current.points < cost) return { ok: false, reason: "not-enough" };

    update((prev) => ({
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

  const purchase = useCallback(async (puzzle: Puzzle): Promise<UnlockResult> => {
    if (snapshot.data.purchased.includes(puzzle.id)) return { ok: false, reason: "already" };
    // Mock checkout. A real provider call (Stripe session + webhook) replaces this.
    update((prev) => ({ ...prev, purchased: [...prev.purchased, puzzle.id] }));
    return { ok: true };
  }, []);

  const registerCompletion = useCallback(
    async (puzzleId: string, difficultyId: DifficultyId, seconds: number) => {
      const difficulty = getDifficulty(difficultyId);
      const previousBest = snapshot.data.solved[puzzleId]?.best?.[difficultyId];
      const firstTime = previousBest === undefined;
      const isBest = firstTime || seconds < previousBest;
      const earned = computeReward(difficulty, seconds, firstTime);

      update((prev) => {
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

      return { earned, firstTime, isBest };
    },
    [],
  );

  const rememberLastPlayed = useCallback((puzzleId: string, difficulty: DifficultyId) => {
    update((prev) => ({ ...prev, lastPlayed: { puzzleId, difficulty, at: Date.now() } }));
  }, []);

  const reset = useCallback(() => {
    update(() => initialState);
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
      ready,
      isUnlocked,
      unlockWithPoints,
      purchase,
      registerCompletion,
      rememberLastPlayed,
      reset,
    }),
    [
      isUnlocked,
      purchase,
      ready,
      registerCompletion,
      rememberLastPlayed,
      reset,
      state,
      unlockWithPoints,
    ],
  );
}
