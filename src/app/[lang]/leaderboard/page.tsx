import { notFound } from "next/navigation";

import { LeaderboardView } from "@/components/leaderboard/leaderboard-view";
import { isLocale, locales } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: PageProps<"/[lang]/leaderboard">) {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const dict = await getDictionary(lang);
  return { title: dict.board.title, description: dict.board.subtitle };
}

export default async function LeaderboardPage({ params }: PageProps<"/[lang]/leaderboard">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  const dict = await getDictionary(lang);

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 px-4 py-8 sm:px-6 sm:py-12">
      <header>
        <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl">{dict.board.title}</h1>
        <p className="mt-1 text-base text-pretty text-ink-soft">{dict.board.subtitle}</p>
      </header>

      <LeaderboardView />
    </div>
  );
}
