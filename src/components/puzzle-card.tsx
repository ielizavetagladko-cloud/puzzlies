"use client";

import Image from "next/image";
import Link from "next/link";

import { CoinIcon } from "@/components/ui/coin";
import type { Puzzle } from "@/data/catalog";
import { t } from "@/i18n/config";
import { useI18n } from "@/i18n/provider";
import { formatPrice, formatSeconds } from "@/lib/points";
import { useGame } from "@/lib/progress";

function LockIcon({ className = "size-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M7 10V8a5 5 0 0 1 10 0v2h.6A1.4 1.4 0 0 1 19 11.4v7.2a1.4 1.4 0 0 1-1.4 1.4H6.4A1.4 1.4 0 0 1 5 18.6v-7.2A1.4 1.4 0 0 1 6.4 10H7Zm2 0h6V8a3 3 0 1 0-6 0v2Z" />
    </svg>
  );
}

export function PuzzleCard({ puzzle, priority = false }: { puzzle: Puzzle; priority?: boolean }) {
  const { dict, locale } = useI18n();
  const { isUnlocked, state, ready } = useGame();

  const unlocked = ready ? isUnlocked(puzzle) : puzzle.access === "free";
  const record = state.solved[puzzle.id];
  const bestTime = record ? Math.min(...Object.values(record.best).filter(Boolean)) : null;

  return (
    <Link
      href={`/${locale}/puzzle/${puzzle.id}`}
      className="group card-soft relative block overflow-hidden transition-transform duration-200 hover:-translate-y-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      <div className="relative aspect-4/3 overflow-hidden">
        <Image
          src={puzzle.image}
          alt={t(puzzle.title, locale)}
          fill
          priority={priority}
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 260px"
          className={`object-cover transition-transform duration-500 group-hover:scale-105 ${
            // The extra scale keeps the blur from sampling transparent edges,
            // which would wash the whole thumbnail out to white.
            unlocked ? "" : "scale-125 blur-[7px] brightness-90"
          }`}
        />

        {!unlocked && (
          <div className="absolute inset-0 grid place-items-center bg-[color-mix(in_srgb,var(--ink)_28%,transparent)]">
            <span className="grid size-12 place-items-center rounded-full bg-surface/90 text-locked shadow-soft">
              <LockIcon className="size-6" />
            </span>
          </div>
        )}

        <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-surface/95 px-2.5 py-1 font-display text-xs font-bold text-ink shadow-soft">
          {puzzle.access === "free" && <span className="text-mint-ink">{dict.common.free}</span>}
          {puzzle.access === "points" &&
            (unlocked ? (
              <span className="text-mint-ink">{dict.common.unlocked}</span>
            ) : (
              <>
                <CoinIcon className="size-4" />
                {puzzle.pointsCost}
              </>
            ))}
          {puzzle.access === "paid" &&
            (unlocked ? (
              <span className="text-mint-ink">{dict.common.unlocked}</span>
            ) : (
              <span className="text-lilac-ink">
                {formatPrice(puzzle.priceCents ?? 0)}
              </span>
            ))}
        </span>

        {bestTime !== null && Number.isFinite(bestTime) && (
          <span className="absolute bottom-2 left-2 rounded-full bg-surface/90 px-2 py-0.5 font-display text-[11px] font-bold text-ink-soft">
            ⏱ {formatSeconds(bestTime)}
          </span>
        )}
      </div>

      <div className="px-3 py-2.5">
        <p className="truncate font-display text-sm font-semibold text-ink">
          {t(puzzle.title, locale)}
        </p>
      </div>
    </Link>
  );
}
