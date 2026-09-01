import { notFound } from "next/navigation";

import { PuzzleDetail } from "@/components/puzzle/puzzle-detail";
import { getPuzzle, puzzles } from "@/data/catalog";
import { isLocale, locales, t } from "@/i18n/config";

export function generateStaticParams() {
  return locales.flatMap((lang) => puzzles.map((puzzle) => ({ lang, id: puzzle.id })));
}

export async function generateMetadata({ params }: PageProps<"/[lang]/puzzle/[id]">) {
  const { lang, id } = await params;
  const puzzle = getPuzzle(id);
  if (!puzzle || !isLocale(lang)) return {};
  return { title: t(puzzle.title, lang) };
}

export default async function PuzzlePage({ params }: PageProps<"/[lang]/puzzle/[id]">) {
  const { lang, id } = await params;
  if (!isLocale(lang)) notFound();

  const puzzle = getPuzzle(id);
  if (!puzzle) notFound();

  return <PuzzleDetail puzzle={puzzle} />;
}
