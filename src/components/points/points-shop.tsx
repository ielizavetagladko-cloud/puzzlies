"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

import { Button, buttonClass } from "@/components/ui/button";
import { CoinIcon } from "@/components/ui/coin";
import { fmt } from "@/i18n/config";
import { useI18n } from "@/i18n/provider";
import { useAuth } from "@/lib/auth";
import type { PointPack } from "@/lib/packs";
import { formatPrice } from "@/lib/points";
import { useGame } from "@/lib/progress";

/** Leaves the site for the provider's payment page. */
function goToCheckout(url: string) {
  window.location.href = url;
}

export function PointsShop({ packs }: { packs: PointPack[] }) {
  const { dict, locale } = useI18n();
  const { user, ready: authReady } = useAuth();
  const { state, ready } = useGame();

  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // What the payment left behind in the URL on the way back.
  const outcome = useSearchParams().get("topup");
  const outcomeMessage =
    outcome === "ok"
      ? dict.packs.success
      : outcome === "cancelled"
        ? dict.packs.cancelled
        : outcome === "pending"
          ? dict.packs.pending
          : null;

  // The best rate on offer, so the strongest pack can be marked as such
  // instead of leaving the reader to divide in their head.
  const bestRate = Math.max(...packs.map((pack) => pack.points / pack.priceCents));

  async function buy(pack: PointPack) {
    setMessage(null);
    setBusy(pack.id);
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packId: pack.id, locale }),
      });

      if (response.status === 401) {
        setMessage(dict.packs.needAccount);
        return;
      }
      if (response.status === 503) {
        setMessage(dict.packs.notConfigured);
        return;
      }
      if (!response.ok) {
        setMessage(dict.packs.failed);
        return;
      }

      const { redirectUrl } = (await response.json()) as { redirectUrl: string };
      goToCheckout(redirectUrl);
    } catch {
      setMessage(dict.packs.failed);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-5">
      {outcomeMessage && (
        <p
          className={`card-soft p-4 text-center text-sm text-pretty ${
            outcome === "ok" ? "text-mint-ink" : "text-ink-soft"
          }`}
        >
          {outcome === "ok" ? "🎉 " : ""}
          {outcomeMessage}
        </p>
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
          const rate = pack.points / pack.priceCents;
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
                {fmt(dict.packs.perDollar, { n: Math.round(rate * 100) })}
              </span>

              <Button
                variant={best ? "primary" : "soft"}
                size="lg"
                className="w-full"
                disabled={busy !== null || !authReady}
                onClick={() => buy(pack)}
              >
                {formatPrice(pack.priceCents)}
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
