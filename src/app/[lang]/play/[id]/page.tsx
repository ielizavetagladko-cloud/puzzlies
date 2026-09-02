import { notFound } from "next/navigation";

import { PlayScreen } from "@/components/puzzle/play-screen";
import { isLocale } from "@/i18n/config";
import { getPuzzleById } from "@/lib/catalogue";
import { getDifficulty } from "@/lib/points";

// The board is an application screen, not a page worth indexing.
export const metadata = { robots: { index: false, follow: true } };

export default async function PlayPage({ params, searchParams }: PageProps<"/[lang]/play/[id]">) {
  const { lang, id } = await params;
  const query = await searchParams;
  if (!isLocale(lang)) notFound();

  const puzzle = await getPuzzleById(id);
  if (!puzzle) notFound();

  const raw = Array.isArray(query.d) ? query.d[0] : query.d;
  const difficulty = getDifficulty(raw);

  return <PlayScreen puzzle={puzzle} difficultyId={difficulty.id} />;
}
