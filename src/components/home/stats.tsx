"use client";

import { StatsRow } from "@/components/ui/stats-row";
import { useI18n } from "@/i18n/provider";
import { formatSeconds } from "@/lib/points";
import { useGame } from "@/lib/progress";

export function HomeStats() {
  const { dict } = useI18n();
  const { state, ready } = useGame();

  const solved = Object.values(state.solved).reduce((sum, record) => sum + record.count, 0);

  const items = [
    { kind: "points" as const, value: state.points, label: dict.home.statPoints },
    { kind: "solved" as const, value: solved, label: dict.home.statSolved },
    { kind: "time" as const, value: formatSeconds(state.totalSeconds), label: dict.home.statTime },
  ];

  return <StatsRow items={items} ready={ready} />;
}
