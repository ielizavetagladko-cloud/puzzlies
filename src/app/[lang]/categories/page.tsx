import { notFound } from "next/navigation";

import { CategoriesGrid } from "@/components/categories/categories-grid";
import { isLocale, locales } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getCatalogue } from "@/lib/catalogue";

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: PageProps<"/[lang]/categories">) {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const dict = await getDictionary(lang);
  return { title: dict.home.categoriesTitle, description: dict.home.categoriesSubtitle };
}

export default async function CategoriesPage({ params }: PageProps<"/[lang]/categories">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  const dict = await getDictionary(lang);
  const { categories, puzzles } = await getCatalogue();

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 sm:px-6 sm:py-10">
      <header>
        <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl">
          {dict.home.categoriesTitle}
        </h1>
        <p className="mt-1 text-base text-pretty text-ink-soft">{dict.home.categoriesSubtitle}</p>
      </header>

      <CategoriesGrid categories={categories} puzzles={puzzles} lang={lang} dict={dict} />
    </div>
  );
}
