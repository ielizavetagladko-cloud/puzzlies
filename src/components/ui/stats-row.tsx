import type { ReactNode } from "react";

import { CoinIcon } from "@/components/ui/coin";

export type StatKind = "points" | "solved" | "time";

/**
 * One glyph per kind of stat, drawn once here so the home page and the
 * profile page — which show the same three numbers with different wording —
 * can never quietly drift apart in how they look.
 */
function PuzzleGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden className={className}>
      {/* Same piece as the puzzle avatar motif — one jigsaw shape for the
          whole site, not a second one invented just for this square. */}
      <path
        d="M20.1 17.1H21.9A4.2 4.2 0 0 1 30.3 17.1H32.1A3 3 0 0 1 35.1 20.1V32.1A3 3 0 0 1 32.1 35.1H20.1A3 3 0 0 1 17.1 32.1V30.3A4.2 4.2 0 0 1 17.1 21.9V20.1A3 3 0 0 1 20.1 17.1Z"
        fill="var(--mint-ink)"
      />
    </svg>
  );
}

function ClockGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} fill="none">
      <circle cx="12" cy="12" r="8.6" stroke="var(--sky-ink)" strokeWidth="1.8" />
      <path
        d="M12 7.4v4.9l3.3 1.9"
        stroke="var(--sky-ink)"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const KIND: Record<StatKind, { accent: string; icon: ReactNode }> = {
  points: { accent: "bg-lemon", icon: <CoinIcon className="size-6" /> },
  solved: { accent: "bg-mint", icon: <PuzzleGlyph className="size-6" /> },
  time: { accent: "bg-sky", icon: <ClockGlyph className="size-6" /> },
};

export function StatsRow({
  items,
  ready = true,
}: {
  items: { kind: StatKind; value: ReactNode; label: string }[];
  ready?: boolean;
}) {
  return (
    <div className={`grid grid-cols-3 gap-2 sm:gap-3 ${ready ? "" : "opacity-50"}`}>
      {items.map((item) => {
        const style = KIND[item.kind];
        return (
          <div
            key={item.kind}
            className="card-soft flex items-center gap-3 px-3 py-3 sm:px-4"
          >
            <span
              className={`hidden size-10 shrink-0 place-items-center rounded-2xl sm:grid ${style.accent}`}
            >
              {style.icon}
            </span>
            <span className="min-w-0">
              <span className="block truncate font-display text-xl font-bold text-ink sm:text-2xl">
                {ready ? item.value : "—"}
              </span>
              <span className="block truncate text-xs text-ink-soft">{item.label}</span>
            </span>
          </div>
        );
      })}
    </div>
  );
}
