import Link from "next/link";
import { notFound } from "next/navigation";

import { PuzzleCard } from "@/components/puzzle-card";
import { accentClasses, categories, getCategory, puzzlesOf } from "@/data/catalog";
import { fmt, isLocale, locales, t } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";

export function generateStaticParams() {
  return locales.flatMap((lang) => categories.map((category) => ({ lang, slug: category.slug })));
}

export async function generateMetadata({ params }: PageProps<"/[lang]/category/[slug]">) {
  const { lang, slug } = await params;
  const category = getCategory(slug);
  if (!category || !isLocale(lang)) return {};

  const dict = await getDictionary(lang);
  const list = puzzlesOf(category.id);
  const description = fmt(dict.seo.category, {
    blurb: t(category.blurb, lang),
    n: list.length,
  });

  return {
    title: t(category.title, lang),
    description,
    alternates: {
      canonical: `/${lang}/category/${slug}`,
      languages: Object.fromEntries(
        locales.map((item) => [item, `/${item}/category/${slug}`]),
      ),
    },
    openGraph: {
      title: t(category.title, lang),
      description,
      images: list[0] ? [{ url: list[0].image, width: 1200, height: 900 }] : undefined,
    },
  };
}

export default async function CategoryPage({ params }: PageProps<"/[lang]/category/[slug]">) {
  const { lang, slug } = await params;
  if (!isLocale(lang)) notFound();

  const category = getCategory(slug);
  if (!category) notFound();

  const dict = await getDictionary(lang);
  const list = puzzlesOf(category.id);
  const accent = accentClasses[category.accent];

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 sm:px-6 sm:py-10">
      <Link
        href={`/${lang}#categories`}
        className="inline-flex items-center gap-1.5 font-display text-sm font-semibold text-ink-soft transition-colors hover:text-ink"
      >
        ← {dict.category.backToAll}
      </Link>

      <header className="card-soft flex items-center gap-4 p-4 sm:p-6">
        <span className={`grid size-16 shrink-0 place-items-center rounded-3xl text-4xl sm:size-20 ${accent.bg}`}>
          {category.icon}
        </span>
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl">
            {t(category.title, lang)}
          </h1>
          <p className="text-sm text-ink-soft sm:text-base">{t(category.blurb, lang)}</p>
          <p className={`mt-1 font-display text-xs font-bold ${accent.text}`}>
            {list.length} {dict.category.puzzles}
          </p>
        </div>
      </header>

      {list.length === 0 ? (
        <p className="py-16 text-center text-ink-soft">{dict.category.empty}</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {list.map((puzzle, index) => (
            <PuzzleCard key={puzzle.id} puzzle={puzzle} priority={index < 4} />
          ))}
        </div>
      )}
    </div>
  );
}
