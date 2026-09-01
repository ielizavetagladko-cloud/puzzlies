"use client";

import Image from "next/image";
import Link from "next/link";

import { buttonClass } from "@/components/ui/button";
import { getPuzzle } from "@/data/catalog";
import { t } from "@/i18n/config";
import { useI18n } from "@/i18n/provider";
import { getDifficulty } from "@/lib/points";
import { useGame } from "@/lib/progress";

export function ContinueCard() {
  const { dict, locale } = useI18n();
  const { state, ready } = useGame();

  if (!ready || !state.lastPlayed) return null;

  const puzzle = getPuzzle(state.lastPlayed.puzzleId);
  if (!puzzle) return null;

  const difficulty = getDifficulty(state.lastPlayed.difficulty);

  return (
    <section className="animate-pop-in">
      <h2 className="mb-3 font-display text-lg font-bold text-ink">{dict.home.continueTitle}</h2>
      <div className="card-soft flex items-center gap-4 p-3 sm:p-4">
        <div className="relative size-20 shrink-0 overflow-hidden rounded-2xl sm:size-24">
          <Image
            src={puzzle.image}
            alt={t(puzzle.title, locale)}
            fill
            sizes="96px"
            className="object-cover"
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-base font-bold text-ink sm:text-lg">
            {t(puzzle.title, locale)}
          </p>
          <p className="text-sm text-ink-soft">
            {difficulty.pieces} {dict.puzzle.pieces} · {dict.difficulty[difficulty.id]}
          </p>
        </div>
        <Link
          href={`/${locale}/play/${puzzle.id}?d=${difficulty.id}`}
          className={buttonClass("primary", "md", "shrink-0")}
        >
          {dict.common.continue}
        </Link>
      </div>
    </section>
  );
}
