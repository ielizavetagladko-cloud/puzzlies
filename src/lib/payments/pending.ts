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

export async function cancelPendingOrder(ref: string): Promise<boolean> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return false;

  const { data, error } = await supabase.rpc("cancel_order", { p_provider_ref: ref });
  await refreshPendingOrders();
  return !error && data === true;
}
