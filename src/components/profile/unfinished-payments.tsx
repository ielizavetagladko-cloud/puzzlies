"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { CoinIcon } from "@/components/ui/coin";
import { useI18n } from "@/i18n/provider";
import { startCheckout } from "@/lib/payments/checkout-form";
import {
  cancelPendingOrder,
  refreshPendingOrders,
  usePendingOrders,
  useReturnedFromCheckout,
} from "@/lib/payments/pending";
import { formatPrice } from "@/lib/points";

/**
 * Payments that were started and left hanging.
 *
 * Shown alongside the balance history because that is where a buyer goes to
 * ask "did my money do anything?" — and an order nobody ever finished is
 * exactly the answer they are looking for.
 */
export function UnfinishedPayments() {
  const { dict, locale } = useI18n();
  const { orders } = usePendingOrders();
  const [busy, setBusy] = useState<string | null>(null);

  // Someone may finish a payment from here and come straight back. Watching for
  // that both refreshes this list and stops a stale "you came back" greeting
  // waiting to ambush them on the top-up page.
  const returned = useReturnedFromCheckout();

  useEffect(() => {
    void refreshPendingOrders();
  }, [returned]);

  if (orders.length === 0) return null;

  async function finish(ref: string, packId: string) {
    setBusy(ref);
    const result = await startCheckout(packId, locale, ref);
    // Anything other than leaving the site means we are still here to say so.
    if (result !== "left") {
      await refreshPendingOrders();
      setBusy(null);
    }
  }

  async function drop(ref: string) {
    setBusy(ref);
    await cancelPendingOrder(ref);
    setBusy(null);
  }

  return (
    <section>
      <h2 className="mb-3 font-display text-xl font-bold text-ink">{dict.profile.unfinished}</h2>
      <div className="card-soft divide-y divide-line overflow-hidden">
        {orders.map((order) => {
          return (
            <div
              key={order.ref}
              className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="inline-flex items-center gap-1.5 font-display font-bold text-ink">
                  {order.points > 0 && (
                    <>
                      <CoinIcon className="size-5" />
                      {order.points}
                    </>
                  )}
                  <span className="text-ink-soft">
                    · {formatPrice(order.amountMinorUnits, order.currency, locale)}
                  </span>
                </p>
                <p className="text-xs text-ink-soft">{dict.profile.unfinishedHint}</p>
              </div>

              <div className="flex shrink-0 gap-2">
                <Button
                  variant="primary"
                  size="md"
                  disabled={busy !== null}
                  onClick={() => finish(order.ref, order.packId)}
                >
                  {dict.profile.finish}
                </Button>
                <Button
                  variant="soft"
                  size="md"
                  disabled={busy !== null}
                  onClick={() => drop(order.ref)}
                >
                  {dict.packs.abandon}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
