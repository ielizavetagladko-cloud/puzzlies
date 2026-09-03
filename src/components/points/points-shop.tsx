"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { TopUpDialog, type TopUpOutcome } from "@/components/points/topup-dialog";
import { Button, buttonClass } from "@/components/ui/button";
import { CoinIcon } from "@/components/ui/coin";
import { fmt } from "@/i18n/config";
import { useI18n } from "@/i18n/provider";
import { useAuth } from "@/lib/auth";
import type { PointPack } from "@/lib/packs";
import { startCheckout } from "@/lib/payments/checkout-form";
import {
  cancelPendingOrder,
  clearReturnedFromCheckout,
  readLatestOrder,
  readOrderStatus,
  refreshPendingOrders,
  useReturnedFromCheckout,
} from "@/lib/payments/pending";
import { formatPrice, formatUnit } from "@/lib/points";
import { reloadProgress, useGame } from "@/lib/progress";

/** The newest unfinished payment, if there is one. */
function unfinishedRefOf(orders: { ref: string }[]): string | null {
  return orders[0]?.ref ?? null;
}

export function PointsShop({ packs }: { packs: PointPack[] }) {
  const { dict, locale } = useI18n();
  const { user, ready: authReady } = useAuth();
  const { state, ready } = useGame();

  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // What the payment left behind in the URL on the way back. It is dropped from
  // the address as soon as it has been shown, so a reload does not congratulate
  // the player a second time for the same purchase.
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [dismissed, setDismissed] = useState(false);

  const raw = params.get("topup");
  const fromUrl: TopUpOutcome | null =
    raw === "ok" || raw === "cancelled" || raw === "failed" ? raw : raw === "pending" ? "unfinished" : null;

  // The buyer is back from the payment page. They may have come by the
  // provider's own return, or by the back button — which restores this page
  // from the browser's cache exactly as it was, buttons still disabled and no
  // parameter in the address to explain anything.
  const returned = useReturnedFromCheckout();
  const [afterReturn, setAfterReturn] = useState<TopUpOutcome | null>(null);

  // A payment we cannot confirm may still be on its way. The order is polled
  // for a short while, so a buyer who really did pay is congratulated rather
  // than asked whether they meant to give up.
  const [settled, setSettled] = useState<{ outcome: TopUpOutcome; points: number } | null>(null);
  const [unfinishedRef, setUnfinishedRef] = useState<string | null>(null);

  const outcome = settled?.outcome ?? fromUrl ?? afterReturn;
  const granted = settled?.points ?? (Number(params.get("points")) || 0);

  // A checkout that never came back left `busy` set. Coming back is the signal
  // to let go of it — nothing else will.
  const waiting = returned ? null : busy;

  useEffect(() => {
    if (!returned || fromUrl) return;

    let live = true;
    void (async () => {
      const order = await readLatestOrder();
      if (!live || !order) return;
      if (order.status === "paid") {
        // Paid while we were away, and the cached page still shows the old
        // balance.
        reloadProgress();
        setSettled({ outcome: "ok", points: order.points });
        return;
      }
      if (order.status === "pending") {
        setUnfinishedRef(order.ref);
        setAfterReturn("unfinished");
      }
    })();

    return () => {
      live = false;
    };
  }, [returned, fromUrl]);

  useEffect(() => {
    if (fromUrl !== "unfinished") return;

    let live = true;
    let tries = 0;

    async function look() {
      const orders = await refreshPendingOrders();
      if (!live) return;
      const ref = unfinishedRefOf(orders);
      if (ref) setUnfinishedRef(ref);
      return ref;
    }

    void look();

    const timer = setInterval(async () => {
      tries += 1;
      const ref = unfinishedRef;
      if (ref) {
        const order = await readOrderStatus(ref);
        if (live && order?.status === "paid") {
          setSettled({ outcome: "ok", points: order.points });
          clearInterval(timer);
          return;
        }
      }
      if (tries >= 10) clearInterval(timer);
    }, 3000);

    return () => {
      live = false;
      clearInterval(timer);
    };
  }, [fromUrl, unfinishedRef]);

  function closeDialog() {
    setDismissed(true);
    setAfterReturn(null);
    clearReturnedFromCheckout();
    if (raw) router.replace(pathname, { scroll: false });
  }

  async function abandon() {
    if (unfinishedRef) await cancelPendingOrder(unfinishedRef);
  }

  async function resume() {
    const order = (await refreshPendingOrders())[0];
    if (!order) {
      closeDialog();
      return;
    }
    setDismissed(true);
    setBusy(order.packId);
    const result = await startCheckout(order.packId, locale, order.ref);
    if (result !== "left") {
      setBusy(null);
      setSettled(result === "already-paid" ? { outcome: "ok", points: 0 } : null);
      if (result !== "already-paid") setMessage(dict.packs.failed);
    }
  }

  // The best rate on offer, so the strongest pack can be marked as such
  // instead of leaving the reader to divide in their head.
  const bestRate = Math.max(...packs.map((pack) => pack.points / pack.priceMinorUnits));

  async function buy(pack: PointPack) {
    setMessage(null);
    setBusy(pack.id);
    const result = await startCheckout(pack.id, locale);
    if (result === "left") return;

    setBusy(null);
    setMessage(
      result === "not-authenticated"
        ? dict.packs.needAccount
        : result === "not-configured"
          ? dict.packs.notConfigured
          : dict.packs.failed,
    );
  }

  return (
    <div className="space-y-5">
      {outcome && !dismissed && (
        <TopUpDialog
          outcome={outcome}
          points={granted}
          onClose={closeDialog}
          {...(outcome === "unfinished"
            ? { onResume: resume, onAbandon: abandon, busy: waiting !== null }
            : null)}
        />
      )}

      <div className="card-soft flex items-center justify-between gap-3 p-4">
        <span className="text-sm text-ink-soft">{dict.unlock.balance}</span>
        <span className="inline-flex items-center gap-1.5 font-display text-xl font-bold text-ink">
          <CoinIcon className="size-6" />
          {ready ? state.points : "—"}
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {packs.map((pack) => {
          const rate = pack.points / pack.priceMinorUnits;
          const best = rate >= bestRate;
          return (
            <div
              key={pack.id}
              className={`card-soft flex flex-col gap-3 p-5 text-center ${
                best ? "ring-2 ring-primary" : ""
              }`}
            >
              {best && (
                <span className="mx-auto -mt-1 rounded-full bg-primary px-3 py-0.5 font-display text-xs font-bold text-primary-on">
                  {dict.packs.best}
                </span>
              )}

              <span className="inline-flex items-center justify-center gap-2 font-display text-3xl font-bold text-ink">
                <CoinIcon className="size-7" />
                {pack.points}
              </span>
              <span className="text-xs text-ink-soft">
                {fmt(dict.packs.rate, {
                  n: Math.round(rate * 100),
                  unit: formatUnit(pack.currency, locale),
                })}
              </span>

              <Button
                variant={best ? "primary" : "soft"}
                size="lg"
                className="w-full"
                disabled={waiting !== null || !authReady}
                onClick={() => buy(pack)}
              >
                {formatPrice(pack.priceMinorUnits, pack.currency, locale)}
              </Button>
            </div>
          );
        })}
      </div>

      {message && (
        <div className="card-soft space-y-3 p-4 text-center">
          <p className="text-sm text-pretty text-ink-soft">{message}</p>
          {!user && authReady && (
            <Link href={`/${locale}/signin`} className={buttonClass("primary", "md")}>
              {dict.auth.signIn}
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
