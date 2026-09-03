"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { TopUpDialog, type TopUpOutcome } from "@/components/points/topup-dialog";

import { Button, buttonClass } from "@/components/ui/button";
import { CoinIcon } from "@/components/ui/coin";
import { fmt } from "@/i18n/config";
import { useI18n } from "@/i18n/provider";
import { useAuth } from "@/lib/auth";
import type { PointPack } from "@/lib/packs";
import { formatPrice, formatUnit } from "@/lib/points";
import { useGame } from "@/lib/progress";

type Checkout =
  | { kind: "redirect"; url: string }
  | { kind: "form"; url: string; fields: Record<string, string | string[]> };

/**
 * Leaves the site for the provider's payment page.
 *
 * Some providers take the buyer by URL. WayForPay takes a signed form, which
 * has to be built and submitted — there is no address that carries it.
 */
function goToCheckout(checkout: Checkout) {
  if (checkout.kind === "redirect") {
    window.location.href = checkout.url;
    return;
  }

  const form = document.createElement("form");
  form.method = "POST";
  form.action = checkout.url;
  form.acceptCharset = "utf-8";

  for (const [name, value] of Object.entries(checkout.fields)) {
    for (const one of Array.isArray(value) ? value : [value]) {
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = name;
      input.value = one;
      form.append(input);
    }
  }

  document.body.append(form);
  form.submit();
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
  const outcome: TopUpOutcome | null =
    raw === "ok" || raw === "cancelled" || raw === "pending" || raw === "failed" ? raw : null;
  const granted = Number(params.get("points")) || 0;

  function closeDialog() {
    setDismissed(true);
    router.replace(pathname, { scroll: false });
  }

  // The best rate on offer, so the strongest pack can be marked as such
  // instead of leaving the reader to divide in their head.
  const bestRate = Math.max(...packs.map((pack) => pack.points / pack.priceMinorUnits));

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

      goToCheckout((await response.json()) as Checkout);
    } catch {
      setMessage(dict.packs.failed);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-5">
      {outcome && !dismissed && (
        <TopUpDialog outcome={outcome} points={granted} onClose={closeDialog} />
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
                disabled={busy !== null || !authReady}
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
