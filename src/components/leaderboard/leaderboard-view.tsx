"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Avatar } from "@/components/ui/avatar";
import { buttonClass } from "@/components/ui/button";
import { fmt } from "@/i18n/config";
import { useI18n } from "@/i18n/provider";
import { useAuth } from "@/lib/auth";
import { loadLeaderboard, RANKED_AFTER, useLeaderboard } from "@/lib/leaderboard";
import { DIFFICULTIES, formatSeconds, type DifficultyId } from "@/lib/points";

/**
 * One table per difficulty, never one table for all of them.
 *
 * An average time only means something against the same number of pieces:
 * mixing them would put anyone who plays twelve-piece boards above everyone who
 * plays three hundred, and not for being any quicker.
 */
export function LeaderboardView() {
  const { dict, locale } = useI18n();
  const { user, ready: authReady } = useAuth();

  const [difficulty, setDifficulty] = useState<DifficultyId>("medium");
  const { loading, rows, mine } = useLeaderboard();

  // Signing in changes what "you" means, so the table is read again.
  useEffect(() => {
    if (!authReady) return;
    void loadLeaderboard(difficulty);
  }, [difficulty, authReady, user?.id]);

  return (
    <div className="space-y-5">
      <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1">
        {DIFFICULTIES.map((level) => (
          <button
            key={level.id}
            type="button"
            onClick={() => setDifficulty(level.id)}
            className={`shrink-0 rounded-full px-4 py-2 font-display text-sm font-bold transition-colors ${
              level.id === difficulty
                ? "bg-primary text-primary-on"
                : "bg-surface text-ink-soft hover:text-ink"
            }`}
          >
            {dict.difficulty[level.id]}
            <span className="ms-1.5 text-xs font-semibold opacity-70">{level.pieces}</span>
          </button>
        ))}
      </div>

      {mine && (
        <div className="card-soft flex flex-wrap items-center justify-between gap-x-4 gap-y-1 p-4">
          <span className="font-display font-bold text-ink">
            {fmt(dict.board.yourPlace, { place: mine.place, total: mine.total })}
          </span>
          <span className="text-sm text-ink-soft">
            {fmt(dict.board.yourTime, {
              time: formatSeconds(mine.avgSeconds),
              solved: mine.solved,
            })}
          </span>
        </div>
      )}

      {loading ? (
        <p className="card-soft p-6 text-center text-sm text-ink-soft">{dict.common.loading}</p>
      ) : rows.length === 0 ? (
        <p className="card-soft p-6 text-center text-sm text-pretty text-ink-soft">
          {fmt(dict.board.empty, { n: RANKED_AFTER })}
        </p>
      ) : (
        <div className="card-soft divide-y divide-line overflow-hidden">
          {rows.map((row) => (
            <div
              key={row.handle + row.place}
              className={`flex items-center gap-3 p-3 sm:p-4 ${
                row.isMe ? "bg-surface-2" : ""
              }`}
            >
              <span
                className={`grid size-9 shrink-0 place-items-center rounded-full font-display text-sm font-bold ${
                  row.place === 1
                    ? "bg-coin text-ink"
                    : row.place <= 3
                      ? "bg-lemon text-ink"
                      : "bg-surface-2 text-ink-soft"
                }`}
              >
                {row.place}
              </span>

              <Avatar id={row.avatar} className="size-9" />

              <span className="min-w-0 flex-1 truncate font-display font-bold text-ink">
                {row.displayName ?? fmt(dict.board.anonymous, { handle: row.handle })}
                {row.isMe && (
                  <span className="ms-2 rounded-full bg-primary px-2 py-0.5 align-middle text-[11px] font-bold text-primary-on">
                    {dict.board.you}
                  </span>
                )}
              </span>

              <span className="shrink-0 text-right">
                <span className="block font-display font-bold text-ink">
                  {formatSeconds(row.avgSeconds)}
                </span>
                <span className="block text-xs text-ink-soft">
                  {fmt(dict.board.solvedShort, { n: row.solved })}
                </span>
              </span>
            </div>
          ))}
        </div>
      )}

      <p className="text-center text-xs text-pretty text-ink-soft">
        {fmt(dict.board.note, { n: RANKED_AFTER })}
      </p>

      {mine && !rows.some((row) => row.isMe && row.displayName) && (
        <div className="card-soft flex flex-col items-center gap-3 p-5 text-center sm:flex-row sm:text-start">
          <p className="flex-1 text-sm text-pretty text-ink-soft">
            {fmt(dict.board.noName, {
              handle: rows.find((row) => row.isMe)?.handle ?? "····",
            })}
          </p>
          <Link href={`/${locale}/profile`} className={buttonClass("soft", "md")}>
            {dict.board.setName}
          </Link>
        </div>
      )}

      {authReady && !user && (
        <div className="card-soft space-y-3 p-5 text-center">
          <p className="text-sm text-pretty text-ink-soft">{dict.board.signInHint}</p>
          <Link href={`/${locale}/signin`} className={buttonClass("primary", "md")}>
            {dict.auth.signIn}
          </Link>
        </div>
      )}
    </div>
  );
}
