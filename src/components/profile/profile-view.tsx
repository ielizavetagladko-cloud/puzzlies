"use client";

import Link from "next/link";

import { PuzzleCard } from "@/components/puzzle-card";
import { Button, buttonClass } from "@/components/ui/button";
import { CoinIcon } from "@/components/ui/coin";
import { useCatalogue } from "@/data/catalogue-provider";
import { t } from "@/i18n/config";
import { useI18n } from "@/i18n/provider";
import { useAuth } from "@/lib/auth";
import { formatSeconds } from "@/lib/points";
import { useGame } from "@/lib/progress";

export function ProfileView() {
  const { dict, locale } = useI18n();
  const { state, ready, source, isUnlocked, reset } = useGame();
  const { user, signOut } = useAuth();
  const { puzzles, getPuzzle } = useCatalogue();

  const solvedCount = Object.values(state.solved).reduce((sum, record) => sum + record.count, 0);
  const collection = puzzles.filter((puzzle) => puzzle.access !== "free" && isUnlocked(puzzle));

  const stats = [
    {
      label: dict.profile.balance,
      value: (
        <span className="inline-flex items-center gap-1.5">
          <CoinIcon className="size-6" />
          {state.points}
        </span>
      ),
      accent: "bg-lemon",
    },
    { label: dict.profile.solved, value: solvedCount, accent: "bg-mint" },
    { label: dict.profile.totalTime, value: formatSeconds(state.totalSeconds), accent: "bg-sky" },
  ];

  return (
    <div className={`mx-auto w-full max-w-5xl space-y-6 px-4 py-6 sm:px-6 sm:py-10 ${ready ? "" : "opacity-60"}`}>
      <header className="card-soft flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:p-6">
        <span className="grid size-16 shrink-0 place-items-center rounded-3xl bg-lilac font-display text-3xl font-bold text-lilac-ink sm:size-20">
          {user ? user.email.slice(0, 1).toUpperCase() : "🐣"}
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-display text-xl font-bold text-ink sm:text-2xl">
            {user ? user.email : dict.profile.guest}
          </h1>
          {user ? (
            <p className="text-sm text-ink-soft">
              {dict.auth.account} ·{" "}
              {{ google: "Google", apple: "Apple", email: "Email" }[user.provider]}
              {user.linkedGuestProgress ? ` · ${dict.auth.linked}` : ""}
            </p>
          ) : (
            <p className="text-sm text-pretty text-ink-soft">{dict.profile.guestNote}</p>
          )}
        </div>
        {user && (
          <Button variant="soft" size="sm" onClick={() => void signOut()}>
            {dict.auth.signOut}
          </Button>
        )}
      </header>

      {ready && !user && (
        <section className="card-soft flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:p-5">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-mint text-2xl">
            ☁️
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-base font-bold text-ink">{dict.auth.saveProgress}</h2>
            <p className="text-sm text-pretty text-ink-soft">{dict.auth.saveProgressHint}</p>
          </div>
          <Link href={`/${locale}/signin`} className={buttonClass("primary", "md", "shrink-0")}>
            {dict.auth.signIn}
          </Link>
        </section>
      )}

      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {stats.map((item) => (
          <div key={item.label} className="card-soft flex items-center gap-3 px-3 py-3 sm:px-4">
            <span className={`hidden size-10 shrink-0 rounded-2xl sm:block ${item.accent}`} />
            <span className="min-w-0">
              <span className="block truncate font-display text-xl font-bold text-ink sm:text-2xl">
                {item.value}
              </span>
              <span className="block truncate text-xs text-ink-soft">{item.label}</span>
            </span>
          </div>
        ))}
      </div>

      <Link href={`/${locale}/points`} className={buttonClass("coin", "md")}>
        <CoinIcon className="size-5" />
        {dict.packs.topUp}
      </Link>

      <section>
        <h2 className="mb-3 font-display text-xl font-bold text-ink">{dict.profile.collection}</h2>
        {collection.length === 0 ? (
          <p className="card-soft p-6 text-center text-sm text-ink-soft">
            {dict.profile.historyEmpty}
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {collection.map((puzzle) => (
              <PuzzleCard key={puzzle.id} puzzle={puzzle} />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 font-display text-xl font-bold text-ink">{dict.profile.history}</h2>
        <div className="card-soft divide-y divide-line overflow-hidden">
          {state.history.length === 0 && (
            <p className="p-6 text-center text-sm text-ink-soft">{dict.profile.historyEmpty}</p>
          )}
          {state.history.slice(0, 20).map((entry) => {
            const puzzle = entry.puzzleId ? getPuzzle(entry.puzzleId) : undefined;
            return (
              <div key={entry.id} className="flex items-center gap-3 px-4 py-3">
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-display text-sm font-semibold text-ink">
                    {dict.reason[entry.reason]}
                  </span>
                  {puzzle && (
                    <span className="block truncate text-xs text-ink-soft">
                      {t(puzzle.title, locale)}
                    </span>
                  )}
                </span>
                <span
                  className={`shrink-0 font-display text-sm font-bold ${
                    entry.delta >= 0 ? "text-mint-ink" : "text-blush-ink"
                  }`}
                >
                  {entry.delta >= 0 ? "+" : ""}
                  {entry.delta}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {source === "account" ? (
        <p className="text-sm text-pretty text-ink-soft">{dict.profile.deleteNote}</p>
      ) : (
        <Button
          variant="danger"
          onClick={() => {
            if (window.confirm(dict.profile.resetConfirm)) reset();
          }}
        >
          {dict.profile.reset}
        </Button>
      )}
    </div>
  );
}
