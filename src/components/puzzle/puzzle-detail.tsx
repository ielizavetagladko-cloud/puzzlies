"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import { SignInPanel } from "@/components/auth/sign-in-panel";
import { Button, buttonClass } from "@/components/ui/button";
import { CoinIcon } from "@/components/ui/coin";
import type { Puzzle } from "@/data/catalog";
import { useCatalogue } from "@/data/catalogue-provider";
import { fmt, t } from "@/i18n/config";
import { useI18n } from "@/i18n/provider";
import { useAuth } from "@/lib/auth";
import {
  DIFFICULTIES,
  formatPrice,
  formatSeconds,
  replayReward,
  type DifficultyId,
} from "@/lib/points";
import { useGame } from "@/lib/progress";

export function PuzzleDetail({ puzzle }: { puzzle: Puzzle }) {
  const { dict, locale } = useI18n();
  const { state, ready, source, isUnlocked, unlockWithPoints, purchase } = useGame();
  const { user, ready: authReady } = useAuth();
  const { getCategory } = useCatalogue();

  const [difficulty, setDifficulty] = useState<DifficultyId>("medium");
  const [dialog, setDialog] = useState<"unlock" | "buy" | null>(null);
  const [busy, setBusy] = useState(false);

  const category = getCategory(puzzle.categoryId);
  const unlocked = ready ? isUnlocked(puzzle) : puzzle.access === "free";
  const cost = puzzle.pointsCost ?? 0;
  const missing = Math.max(0, cost - state.points);
  const record = state.solved[puzzle.id];
  const best = record?.best?.[difficulty];
  const needsAccount = dialog === "buy" && authReady && !user;

  async function confirmUnlock() {
    setBusy(true);
    const result = await unlockWithPoints(puzzle);
    setBusy(false);
    if (result.ok) setDialog(null);
  }

  async function confirmPurchase() {
    setBusy(true);
    const result = await purchase(puzzle);
    setBusy(false);
    if (result.ok) setDialog(null);
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5 px-4 py-6 sm:px-6 sm:py-10">
      {category && (
        <Link
          href={`/${locale}/category/${category.slug}`}
          className="inline-flex items-center gap-1.5 font-display text-sm font-semibold text-ink-soft transition-colors hover:text-ink"
        >
          ← {t(category.title, locale)}
        </Link>
      )}

      <div className="grid gap-5 md:grid-cols-[1.1fr_1fr]">
        <div className="card-soft relative aspect-4/3 overflow-hidden">
          <Image
            src={puzzle.image}
            alt={t(puzzle.title, locale)}
            fill
            priority
            sizes="(max-width: 768px) 100vw, 560px"
            className={`object-cover ${unlocked ? "" : "scale-125 blur-lg brightness-90"}`}
          />
          {!unlocked && (
            <div className="absolute inset-0 grid place-items-center bg-[color-mix(in_srgb,var(--ink)_25%,transparent)]">
              <span className="rounded-full bg-surface/90 px-4 py-2 font-display text-sm font-bold text-ink-soft shadow-soft">
                🔒 {dict.puzzle.lockedHint}
              </span>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-5">
          <div>
            <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl">
              {t(puzzle.title, locale)}
            </h1>
            {record && (
              <p className="mt-1 text-sm text-ink-soft">
                {dict.profile.solved}: {record.count}
              </p>
            )}
          </div>

          {unlocked ? (
            <>
              <div>
                <h2 className="mb-2 font-display text-sm font-bold text-ink-soft">
                  {dict.puzzle.chooseDifficulty}
                </h2>
                <div className="grid grid-cols-2 gap-2">
                  {DIFFICULTIES.map((item) => {
                    const active = item.id === difficulty;
                    // Already solved at this size? Then the honest number is
                    // the replay reward, not the first-time one.
                    const done = record?.best?.[item.id] !== undefined;
                    const reward = done ? replayReward(item) : item.reward;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setDifficulty(item.id)}
                        className={`rounded-3xl border p-3 text-left transition-colors ${
                          active
                            ? "border-primary bg-surface-2 ring-2 ring-primary"
                            : "border-line bg-surface hover:bg-surface-2"
                        }`}
                      >
                        <span className="block font-display text-base font-bold text-ink">
                          {dict.difficulty[item.id]}
                        </span>
                        <span className="block text-xs text-ink-soft">
                          {item.pieces} {dict.puzzle.pieces}
                        </span>
                        <span className="mt-1 inline-flex items-center gap-1 font-display text-xs font-bold text-coin-deep">
                          <CoinIcon className="size-3.5" />+{reward}
                          {done && (
                            <span className="font-normal text-ink-soft">
                              · {dict.puzzle.replay}
                            </span>
                          )}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <p className="text-sm text-ink-soft">
                {dict.puzzle.best}:{" "}
                <span className="font-display font-bold text-ink">
                  {best ? formatSeconds(best) : dict.puzzle.notPlayed}
                </span>
              </p>

              <Link
                href={`/${locale}/play/${puzzle.id}?d=${difficulty}`}
                className={buttonClass("primary", "lg", "w-full")}
              >
                🧩 {dict.puzzle.start}
              </Link>
            </>
          ) : puzzle.access === "points" ? (
            <div className="card-soft space-y-3 p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-ink-soft">{dict.unlock.cost}</span>
                <span className="inline-flex items-center gap-1 font-display font-bold text-ink">
                  <CoinIcon className="size-4" />
                  {cost}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-ink-soft">{dict.unlock.balance}</span>
                <span className="inline-flex items-center gap-1 font-display font-bold text-ink">
                  <CoinIcon className="size-4" />
                  {ready ? state.points : "—"}
                </span>
              </div>
              <Button
                variant="coin"
                size="lg"
                className="w-full"
                disabled={!ready || missing > 0}
                onClick={() => setDialog("unlock")}
              >
                {missing > 0
                  ? fmt(dict.puzzle.notEnoughPoints, { n: missing })
                  : fmt(dict.puzzle.unlockFor, { n: cost })}
              </Button>
              {missing > 0 && <p className="text-center text-xs text-ink-soft">{dict.unlock.notEnough}</p>}
            </div>
          ) : (
            <div className="card-soft space-y-3 p-4">
              <p className="text-sm text-ink-soft">{dict.puzzle.paidOnly}</p>
              <Button
                variant="primary"
                size="lg"
                className="w-full"
                disabled={!ready}
                onClick={() => setDialog("buy")}
              >
                {fmt(dict.puzzle.buyFor, { price: formatPrice(puzzle.priceCents ?? 0) })}
              </Button>
            </div>
          )}
        </div>
      </div>

      {dialog && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-[color-mix(in_srgb,var(--ink)_45%,transparent)] p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => !busy && setDialog(null)}
        >
          <div
            className="card-soft w-full max-w-sm animate-pop-in space-y-4 p-5"
            onClick={(event) => event.stopPropagation()}
          >
            {/* Paying needs an identity to attach the picture to, so the sign-in
                step lives inside the dialog instead of sending people away. */}
            {needsAccount ? (
              <>
                <h2 className="font-display text-xl font-bold text-ink">
                  {dict.auth.purchaseTitle}
                </h2>
                <p className="text-sm text-pretty text-ink-soft">{dict.auth.purchaseSubtitle}</p>
                <SignInPanel />
                <button
                  type="button"
                  onClick={() => setDialog(null)}
                  className="w-full font-display text-sm font-semibold text-ink-soft transition-colors hover:text-ink"
                >
                  {dict.common.cancel}
                </button>
              </>
            ) : (
              <>
                <h2 className="font-display text-xl font-bold text-ink">
                  {dialog === "unlock" ? dict.unlock.title : dict.shop.buyTitle}
                </h2>
                <p className="font-display text-lg font-bold text-ink">
                  {t(puzzle.title, locale)}
                </p>

                {dialog === "buy" && source === "account" ? (
                  <p className="rounded-2xl bg-lemon/60 px-3 py-2 text-sm text-pretty text-ink">
                    ⏳ {dict.shop.notAvailable}
                  </p>
                ) : dialog === "unlock" ? (
                  <p className="inline-flex items-center gap-1.5 text-sm text-ink-soft">
                    {dict.unlock.cost}: <CoinIcon className="size-4" />
                    <span className="font-display font-bold text-ink">{cost}</span>
                  </p>
                ) : (
                  <>
                    <p className="font-display text-2xl font-bold text-ink">
                      {formatPrice(puzzle.priceCents ?? 0)}
                    </p>
                    <p className="rounded-2xl bg-lemon/60 px-3 py-2 text-xs text-ink">
                      ⚠️ {dict.shop.mockNotice}
                    </p>
                  </>
                )}

                <div className="flex gap-2">
                  <Button
                    variant="soft"
                    className="flex-1"
                    disabled={busy}
                    onClick={() => setDialog(null)}
                  >
                    {dict.common.cancel}
                  </Button>
                  {!(dialog === "buy" && source === "account") && (
                    <Button
                      variant={dialog === "unlock" ? "coin" : "primary"}
                      className="flex-1"
                      disabled={busy}
                      onClick={dialog === "unlock" ? confirmUnlock : confirmPurchase}
                    >
                      {dialog === "unlock" ? dict.unlock.confirm : dict.shop.confirm}
                    </Button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
