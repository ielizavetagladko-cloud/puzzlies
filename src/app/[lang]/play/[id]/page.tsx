import { notFound } from "next/navigation";

import { PlayScreen } from "@/components/puzzle/play-screen";
import { getPuzzle } from "@/data/catalog";
import { isLocale } from "@/i18n/config";
import { getDifficulty } from "@/lib/points";

export default async function PlayPage({ params, searchParams }: PageProps<"/[lang]/play/[id]">) {
  const { lang, id } = await params;
  const query = await searchParams;
  if (!isLocale(lang)) notFound();

  const puzzle = getPuzzle(id);
  if (!puzzle) notFound();

  const raw = Array.isArray(query.d) ? query.d[0] : query.d;
  const difficulty = getDifficulty(raw);

  return <PlayScreen puzzle={puzzle} difficultyId={difficulty.id} />;
}
