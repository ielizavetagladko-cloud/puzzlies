"use client";

import type { Session, User } from "@supabase/supabase-js";
import { useCallback, useMemo, useSyncExternalStore } from "react";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured, supabaseAnonKey, supabaseUrl } from "@/lib/supabase/config";

/**
 * Account store.
 *
 * With Supabase configured this is real authentication: a magic link by email,
 * or an OAuth provider. Without it the store falls back to a local demo account
 * so the sign-in flow can still be walked through — which is what the deployed
 * site did before the project existed.
 *
 * Either way the surface is the same, so no screen needs to know which mode it
 * is in beyond hiding the demo-only "open the link" button.
 */

const DEMO_KEY = "puzzlies.account.v1";
const PENDING_KEY = "puzzlies.account.pending.v1";

export type Provider = "email" | "google" | "apple";
export type AuthMode = "supabase" | "demo";

export type Account = {
  id: string;
  email: string;
  provider: Provider;
  createdAt: number;
  /** Guest points and unlocks were carried over into this account. */
  linkedGuestProgress: boolean;
};

export type PendingLink = { email: string; sentAt: number };

/** Which social providers are actually switched on in the Supabase project. */
export type EnabledProviders = { google: boolean; apple: boolean };

type Snapshot = {
  user: Account | null;
  pending: PendingLink | null;
  ready: boolean;
  mode: AuthMode;
  providers: EnabledProviders;
};

const mode: AuthMode = isSupabaseConfigured ? "supabase" : "demo";

const serverSnapshot: Snapshot = {
  user: null,
  pending: null,
  ready: false,
  mode,
  // In demo mode every button works; with a real project we ask which
  // providers are on before offering them.
  providers: { google: mode === "demo", apple: mode === "demo" },
};
let snapshot: Snapshot = serverSnapshot;
let initialised = false;

const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function set(next: Partial<Snapshot>) {
  snapshot = { ...snapshot, ...next, ready: true };
  emit();
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
    /* private mode — nothing to persist to */
  }
}

function accountFromUser(user: User | null | undefined): Account | null {
  if (!user) return null;
  const raw = (user.app_metadata?.provider ?? "email") as string;
  const provider: Provider = raw === "google" || raw === "apple" ? raw : "email";
  return {
    id: user.id,
    email: user.email ?? "",
    provider,
    createdAt: Date.parse(user.created_at ?? "") || Date.now(),
    // Guest progress lives in this browser and is adopted on sign-in; the
    // merge into the database lands with the server-backed store.
    linkedGuestProgress: true,
  };
}

/**
 * Asks the project which sign-in methods are enabled.
 *
 * This matters because `signInWithOAuth` does not call the API — it redirects
 * the browser straight to Supabase, which answers a disabled provider with raw
 * JSON. There is no error for the client to catch, so the only way to keep that
 * page from ever appearing is to not offer the button in the first place.
 */
async function loadProviders() {
  try {
    const response = await fetch(`${supabaseUrl}/auth/v1/settings`, {
      headers: { apikey: supabaseAnonKey },
    });
    if (!response.ok) return;
    const settings = (await response.json()) as { external?: Record<string, boolean> };
    set({
      providers: {
        google: settings.external?.google === true,
        apple: settings.external?.apple === true,
      },
    });
  } catch {
    // Leave the providers hidden — email always works.
  }
}

function initialise() {
  if (initialised || typeof window === "undefined") return;
  initialised = true;

  const supabase = getSupabaseBrowserClient();

  if (!supabase) {
    set({ user: read<Account>(DEMO_KEY), pending: read<PendingLink>(PENDING_KEY) });
    return;
  }

  void loadProviders();

  supabase.auth
    .getSession()
    .then(({ data }: { data: { session: Session | null } }) => {
      set({ user: accountFromUser(data.session?.user), pending: read<PendingLink>(PENDING_KEY) });
    })
    .catch(() => set({ user: null }));

  supabase.auth.onAuthStateChange((_event: string, session: Session | null) => {
    if (session?.user) write(PENDING_KEY, null);
    set({ user: accountFromUser(session?.user), pending: session?.user ? null : snapshot.pending });
  });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  initialise();
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

export function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
}

/** Where the magic link and OAuth providers send the browser back to. */
function callbackUrl(next?: string) {
  const url = new URL("/auth/callback", window.location.origin);
  url.searchParams.set("next", next ?? window.location.pathname);
  return url.toString();
}

export type AuthResult = { ok: boolean; reason?: string };

export function useAuth() {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const requestEmailLink = useCallback(async (email: string): Promise<AuthResult> => {
    const address = email.trim();
    if (!isValidEmail(address)) return { ok: false, reason: "invalid-email" };

    const supabase = getSupabaseBrowserClient();
    if (supabase) {
      const { error } = await supabase.auth.signInWithOtp({
        email: address,
        options: { emailRedirectTo: callbackUrl() },
      });
      if (error) return { ok: false, reason: error.message };
    }

    const pending: PendingLink = { email: address, sentAt: Date.now() };
    write(PENDING_KEY, pending);
    set({ pending });
    return { ok: true };
  }, []);

  /** Demo mode only: stands in for the click on the emailed link. */
  const completeEmailLink = useCallback(async (): Promise<AuthResult> => {
    const current = snapshot.pending;
    if (!current || snapshot.mode !== "demo") return { ok: false };

    const account: Account = {
      id: Math.random().toString(36).slice(2, 12),
      email: current.email.toLowerCase(),
      provider: "email",
      createdAt: Date.now(),
      linkedGuestProgress: true,
    };
    write(DEMO_KEY, account);
    write(PENDING_KEY, null);
    set({ user: account, pending: null });
    return { ok: true };
  }, []);

  const cancelEmailLink = useCallback(() => {
    write(PENDING_KEY, null);
    set({ pending: null });
  }, []);

  const signInWithProvider = useCallback(
    async (provider: "google" | "apple"): Promise<AuthResult> => {
      const supabase = getSupabaseBrowserClient();

      if (!supabase) {
        const account: Account = {
          id: Math.random().toString(36).slice(2, 12),
          email:
            provider === "google"
              ? "demo.player@gmail.com"
              : "demo.player@privaterelay.appleid.com",
          provider,
          createdAt: Date.now(),
          linkedGuestProgress: true,
        };
        write(DEMO_KEY, account);
        set({ user: account, pending: null });
        return { ok: true };
      }

      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: callbackUrl() },
      });
      // The provider is only usable once it is switched on in the Supabase
      // dashboard; until then say so plainly instead of failing silently.
      if (error) return { ok: false, reason: "provider-unavailable" };
      return { ok: true };
    },
    [],
  );

  const signInWithGoogle = useCallback(() => signInWithProvider("google"), [signInWithProvider]);
  const signInWithApple = useCallback(() => signInWithProvider("apple"), [signInWithProvider]);

  const signOut = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();
    if (supabase) await supabase.auth.signOut();
    write(DEMO_KEY, null);
    write(PENDING_KEY, null);
    set({ user: null, pending: null });
  }, []);

  return useMemo(
    () => ({
      user: state.user,
      pending: state.pending,
      ready: state.ready,
      mode: state.mode,
      providers: state.providers,
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
      requestEmailLink,
      signInWithApple,
      signInWithGoogle,
      signOut,
      state,
    ],
  );
}
