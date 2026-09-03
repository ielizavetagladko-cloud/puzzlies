"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { CoinIcon } from "@/components/ui/coin";
import { PuzzleMark } from "@/components/site/logo";
import { useI18n } from "@/i18n/provider";

export type TopUpOutcome = "ok" | "cancelled" | "pending" | "failed";

/** How long a message stays before it bows out on its own. */
const LINGER_MS = 7000;
/** Must match --animate-shrink-out, or the panel would vanish mid-animation. */
const EXIT_MS = 220;

export function TopUpDialog({
  outcome,
  points,
  onClose,
}: {
  outcome: TopUpOutcome;
  points: number;
  onClose: () => void;
}) {
  const { dict } = useI18n();
  const [leaving, setLeaving] = useState(false);

  // One timer for the wait, another for the shrink — the panel has to finish
  // animating before it is taken off the page.
  useEffect(() => {
    const linger = setTimeout(() => setLeaving(true), LINGER_MS);
    return () => clearTimeout(linger);
  }, []);

  useEffect(() => {
    if (!leaving) return;
    const exit = setTimeout(onClose, EXIT_MS);
    return () => clearTimeout(exit);
  }, [leaving, onClose]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setLeaving(true);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const copy = dict.packs;
  const title = copy[`${outcome}Title` as const];
  const body = copy[`${outcome}Body` as const];

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${
        leaving ? "animate-fade-out" : "animate-fade-in"
      }`}
    >
      {/* Dismissing by clicking away is expected of a dialog this small. The
          scrim is built from --shadow-rgb, which is dark in both themes; --ink
          is near-white in the dark one and would veil the page in white. */}
      <button
        type="button"
        aria-label={copy.close}
        onClick={() => setLeaving(true)}
        className="absolute inset-0 cursor-default bg-[rgb(var(--shadow-rgb)/0.45)] backdrop-blur-sm"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`card-soft relative max-h-full w-full max-w-sm space-y-3 overflow-y-auto p-6 text-center ${
          leaving ? "animate-shrink-out" : "animate-grow-in"
        }`}
      >
        <PuzzleMark className="mx-auto size-14 animate-float" />

        <h2 className="font-display text-2xl font-bold text-balance text-ink">{title}</h2>

        {outcome === "ok" && (
          <span className="inline-flex items-center gap-2 font-display text-3xl font-bold text-coin-deep">
            <CoinIcon className="size-8" />+{points}
          </span>
        )}

        <p className="text-sm text-pretty text-ink-soft">{body}</p>

        <Button variant="primary" size="lg" className="w-full" onClick={() => setLeaving(true)}>
          {copy.close}
        </Button>
      </div>
    </div>
  );
}
