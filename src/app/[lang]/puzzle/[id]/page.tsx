import { notFound } from "next/navigation";

import { PuzzleDetail } from "@/components/puzzle/puzzle-detail";
import { getPuzzle, puzzles } from "@/data/catalog";
import { fmt, isLocale, locales, t } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";

export function generateStaticParams() {
  return locales.flatMap((lang) => puzzles.map((puzzle) => ({ lang, id: puzzle.id })));
}

export async function generateMetadata({ params }: PageProps<"/[lang]/puzzle/[id]">) {
  const { lang, id } = await params;
  const puzzle = getPuzzle(id);
  if (!puzzle || !isLocale(lang)) return {};

  const dict = await getDictionary(lang);
  const title = t(puzzle.title, lang);
  const description = fmt(dict.seo.puzzle, { title });

  return {
    title,
    description,
    alternates: {
      canonical: `/${lang}/puzzle/${id}`,
      languages: Object.fromEntries(locales.map((item) => [item, `/${item}/puzzle/${id}`])),
    },
    openGraph: {
      title,
      description,
      images: [{ url: puzzle.image, width: puzzle.width, height: puzzle.height, alt: title }],
    },
  };
}

export default async function PuzzlePage({ params }: PageProps<"/[lang]/puzzle/[id]">) {
  const { lang, id } = await params;
  if (!isLocale(lang)) notFound();

  const puzzle = getPuzzle(id);
  if (!puzzle) notFound();

  return <PuzzleDetail puzzle={puzzle} />;
}
