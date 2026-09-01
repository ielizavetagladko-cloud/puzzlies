"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

/**
 * Account store — demo implementation.
 *
 * The whole point of this module is the shape of its API: `requestEmailLink`,
 * `completeEmailLink`, `signInWithGoogle`, `signInWithApple`, `signOut`. When
 * Supabase Auth is wired up, only the bodies change
 * (`supabase.auth.signInWithOtp`, `signInWithOAuth({ provider: "google" |
 * "apple" })`, `signOut`) — the screens calling them stay as they are.
 *
 * For now the "magic link" is not emailed anywhere: the pending token is kept
 * locally and the sign-in screen offers a button that opens it, so the flow can
 * be walked through end to end.
 */

const STORAGE_KEY = "puzzlies.account.v1";
const PENDING_KEY = "puzzlies.account.pending.v1";

export type Provider = "email" | "google" | "apple";

export type Account = {
  id: string;
  email: string;
  provider: Provider;
  createdAt: number;
  /** Guest points and unlocks were carried over into this account. */
  linkedGuestProgress: boolean;
};

export type PendingLink = { email: string; token: string; sentAt: number };

type Snapshot = { user: Account | null; pending: PendingLink | null; ready: boolean };

const serverSnapshot: Snapshot = { user: null, pending: null, ready: false };
let snapshot: Snapshot = serverSnapshot;

const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function read<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown) {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* private mode — the demo account just will not survive a reload */
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!snapshot.ready && typeof window !== "undefined") {
    snapshot = {
      user: read<Account>(STORAGE_KEY),
      pending: read<PendingLink>(PENDING_KEY),
      ready: true,
    };
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

function setUser(user: Account | null) {
  snapshot = { ...snapshot, user, pending: null, ready: true };
  write(STORAGE_KEY, user);
  write(PENDING_KEY, null);
  emit();
}

function setPending(pending: PendingLink | null) {
  snapshot = { ...snapshot, pending, ready: true };
  write(PENDING_KEY, pending);
  emit();
}

function randomId() {
  return Math.random().toString(36).slice(2, 12);
}

export function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
}

function createAccount(email: string, provider: Provider): Account {
  return {
    id: randomId(),
    email: email.trim().toLowerCase(),
    provider,
    createdAt: Date.now(),
    // Guest progress already lives in this browser, so signing in adopts it.
    // With Supabase this becomes a real merge of local state into the profile.
    linkedGuestProgress: true,
  };
}

export function useAuth() {
  const { user, pending, ready } = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  const requestEmailLink = useCallback(async (email: string) => {
    if (!isValidEmail(email)) return { ok: false as const, reason: "invalid-email" as const };
    setPending({ email: email.trim(), token: randomId(), sentAt: Date.now() });
    return { ok: true as const };
  }, []);

  /** Stands in for the click on the emailed link. */
  const completeEmailLink = useCallback(async () => {
    const current = snapshot.pending;
    if (!current) return { ok: false as const };
    setUser(createAccount(current.email, "email"));
    return { ok: true as const };
  }, []);

  const cancelEmailLink = useCallback(() => setPending(null), []);

  const signInWithGoogle = useCallback(async (email = "demo.player@gmail.com") => {
    setUser(createAccount(email, "google"));
    return { ok: true as const };
  }, []);

  /**
   * Sign in with Apple. On iOS and macOS the real flow opens the system sheet
   * with Face ID / Touch ID; "Hide My Email" then hands us a private relay
   * address, which is why the account is keyed by id and not by email.
   */
  const signInWithApple = useCallback(async (email = "demo.player@privaterelay.appleid.com") => {
    setUser(createAccount(email, "apple"));
    return { ok: true as const };
  }, []);

  const signOut = useCallback(async () => {
    setUser(null);
  }, []);

  return useMemo(
    () => ({
      user,
      pending,
      ready,
      requestEmailLink,
      completeEmailLink,
      cancelEmailLink,
      signInWithGoogle,
      signInWithApple,
      signOut,
    }),
    [
      cancelEmailLink,
      completeEmailLink,
      pending,
      ready,
      requestEmailLink,
      signInWithApple,
      signInWithGoogle,
      signOut,
      user,
    ],
  );
}
