import Link from "next/link";
import { notFound } from "next/navigation";

import { ContinueCard } from "@/components/home/continue-card";
import { StatsRow } from "@/components/home/stats";
import { PuzzleCard } from "@/components/puzzle-card";
import { buttonClass } from "@/components/ui/button";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getCatalogue } from "@/lib/catalogue";

export default async function HomePage({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  const { puzzles } = await getCatalogue();

  const freePuzzles = puzzles.filter((puzzle) => puzzle.access === "free");

  return (
    <div className="mx-auto w-full max-w-6xl space-y-10 px-4 py-6 sm:px-6 sm:py-10">
      {/* ------------------------------------------------------------ hero */}
      <section className="card-soft relative overflow-hidden px-5 py-8 sm:px-10 sm:py-12">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-10 -top-10 size-48 rounded-full bg-lilac/50 blur-2xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-16 -left-10 size-52 rounded-full bg-mint/40 blur-2xl"
        />

        <div className="relative max-w-2xl">
          <span className="inline-flex items-center gap-2 rounded-full bg-surface-2 px-3 py-1 font-display text-xs font-bold text-lilac-ink">
            🧩 {dict.common.tagline}
          </span>
          <h1 className="mt-4 font-display text-3xl leading-tight font-bold text-balance text-ink sm:text-5xl">
            {dict.home.heroTitle}
          </h1>
          <p className="mt-3 max-w-xl text-base text-pretty text-ink-soft sm:text-lg">
            {dict.home.heroSubtitle}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="#free" className={buttonClass("primary", "lg")}>
              {dict.home.heroCta}
            </Link>
            <Link href={`/${lang}/profile`} className={buttonClass("soft", "lg")}>
              {dict.home.heroSecondary}
            </Link>
          </div>
        </div>
      </section>

      <StatsRow />

      <ContinueCard />

      {/* ------------------------------------------------------ free puzzles */}
      <section id="free" className="scroll-mt-20">
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-bold text-ink sm:text-2xl">
              {dict.home.freeTitle}
            </h2>
            <p className="text-sm text-ink-soft">{dict.home.freeSubtitle}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {freePuzzles.map((puzzle, index) => (
            <PuzzleCard key={puzzle.id} puzzle={puzzle} priority={index < 4} />
          ))}
        </div>
      </section>

    </div>
  );
}
