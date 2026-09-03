"use client";

import { useSyncExternalStore } from "react";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";

/**
 * Payments that were started and never finished.
 *
 * A buyer who opens WayForPay and closes the tab leaves an order at 'pending'.
 * It is read straight from the database rather than kept in the browser, so it
 * survives a closed tab, a reload, or another device — which is the whole point
 * of showing it.
 */

export type PendingOrder = {
  ref: string;
  packId: string;
  points: number;
  amountMinorUnits: number;
  currency: string;
  createdAt: string;
};

/**
 * Older than this and an unfinished payment is not worth chasing: the payment
 * session at the provider has long expired, and offering to "continue" it would
 * only start a new one behind a misleading word.
 */
const STALE_AFTER_MS = 24 * 60 * 60 * 1000;

type State = { ready: boolean; orders: PendingOrder[] };

let state: State = { ready: false, orders: [] };
const listeners = new Set<() => void>();

function set(next: State) {
  state = next;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const serverState: State = { ready: false, orders: [] };

export function usePendingOrders(): State {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => serverState,
  );
}

export async function refreshPendingOrders(): Promise<PendingOrder[]> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) {
    set({ ready: true, orders: [] });
    return [];
  }

  const since = new Date(Date.now() - STALE_AFTER_MS).toISOString();
  const { data } = await supabase
    .from("orders")
    // The pack comes along for the ride: the order records what was charged,
    // not what it buys, and the buyer wants to see the points.
    .select("provider_ref, pack_id, amount_cents, currency, created_at, point_packs(points)")
    .eq("status", "pending")
    .not("pack_id", "is", null)
    .gte("created_at", since)
    .order("created_at", { ascending: false });

  // Row level security limits this to the buyer's own orders; a guest with no
  // session simply gets nothing back.
  const orders: PendingOrder[] = (data ?? [])
    .filter((row) => row.provider_ref)
    .map((row) => ({
      ref: row.provider_ref as string,
      packId: row.pack_id as string,
      points: (row.point_packs as { points?: number } | null)?.points ?? 0,
      amountMinorUnits: row.amount_cents as number,
      currency: (row.currency as string) ?? "UAH",
      createdAt: row.created_at as string,
    }));

  set({ ready: true, orders });
  return orders;
}

/** What became of one order — used while waiting for a late confirmation. */
export async function readOrderStatus(
  ref: string,
): Promise<{ status: string; points: number } | null> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return null;

  const { data } = await supabase
    .from("orders")
    .select("status, points_granted")
    .eq("provider_ref", ref)
    .maybeSingle();

  if (!data) return null;
  return { status: data.status as string, points: (data.points_granted as number) ?? 0 };
}

// ------------------------------------------------- coming back from paying

/**
 * Remembers that we sent someone off to pay.
 *
 * The buyer may come back any number of ways: the provider's own return, the
 * back button, or reopening the tab. Only the first of those tells us anything
 * through the URL, so the fact that a payment was started is kept in the tab
 * itself, where it survives all three.
 */
const STARTED_KEY = "puzzlies:checkout-started";

let returned = false;
const returnListeners = new Set<() => void>();
let watching = false;

export function markCheckoutStarted() {
  try {
    sessionStorage.setItem(STARTED_KEY, "1");
  } catch {
    // Private mode, or storage denied. The flow still works, it just cannot
    // greet the buyer on the way back.
  }
}

function noticeReturn() {
  try {
    if (!sessionStorage.getItem(STARTED_KEY)) return;
    sessionStorage.removeItem(STARTED_KEY);
  } catch {
    return;
  }
  returned = true;
  void refreshPendingOrders();
  for (const listener of returnListeners) listener();
}

function watchForReturn() {
  if (watching || typeof window === "undefined") return;
  watching = true;
  // Not during a render: the back button restores this page from the browser
  // cache without re-running anything, and pageshow is what fires then.
  setTimeout(noticeReturn, 0);
  window.addEventListener("pageshow", noticeReturn);
}

/** True once the buyer is back from the provider, however they got here. */
export function useReturnedFromCheckout(): boolean {
  return useSyncExternalStore(
    (listener) => {
      returnListeners.add(listener);
      watchForReturn();
      return () => returnListeners.delete(listener);
    },
    () => returned,
    () => false,
  );
}

export function clearReturnedFromCheckout() {
  if (!returned) return;
  returned = false;
  for (const listener of returnListeners) listener();
}

/** The newest order of any status — what became of the payment just made. */
export async function readLatestOrder(): Promise<{
  ref: string;
  status: string;
  points: number;
} | null> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return null;

  const { data } = await supabase
    .from("orders")
    .select("provider_ref, status, points_granted")
    .not("pack_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data?.provider_ref) return null;
  return {
    ref: data.provider_ref as string,
    status: data.status as string,
    points: (data.points_granted as number) ?? 0,
  };
}

export async function cancelPendingOrder(ref: string): Promise<boolean> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return false;

  const { data, error } = await supabase.rpc("cancel_order", { p_provider_ref: ref });
  await refreshPendingOrders();
  return !error && data === true;
}
