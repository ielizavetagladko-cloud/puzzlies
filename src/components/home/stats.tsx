"use client";

import { useI18n } from "@/i18n/provider";
import { formatSeconds } from "@/lib/points";
import { useGame } from "@/lib/progress";

export function StatsRow() {
  const { dict } = useI18n();
  const { state, ready } = useGame();

  const solved = Object.values(state.solved).reduce((sum, record) => sum + record.count, 0);

  const items = [
    { label: dict.home.statPoints, value: state.points, accent: "bg-lemon" },
    { label: dict.home.statSolved, value: solved, accent: "bg-mint" },
    { label: dict.home.statTime, value: formatSeconds(state.totalSeconds), accent: "bg-sky" },
  ];

  return (
    <div className={`grid grid-cols-3 gap-2 sm:gap-3 ${ready ? "" : "opacity-50"}`}>
      {items.map((item) => (
        <div key={item.label} className="card-soft flex items-center gap-3 px-3 py-3 sm:px-4">
          <span className={`hidden size-10 shrink-0 rounded-2xl sm:block ${item.accent}`} />
          <span className="min-w-0">
            <span className="block truncate font-display text-xl font-bold text-ink sm:text-2xl">
              {ready ? item.value : "—"}
            </span>
            <span className="block truncate text-xs text-ink-soft">{item.label}</span>
          </span>
        </div>
      ))}
    </div>
  );
}
