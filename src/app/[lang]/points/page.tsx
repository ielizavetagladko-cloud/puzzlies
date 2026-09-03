import { notFound } from "next/navigation";
import { Suspense } from "react";

import { PointsShop } from "@/components/points/points-shop";
import { isLocale, locales } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getPointPacks } from "@/lib/packs";

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: PageProps<"/[lang]/points">) {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const dict = await getDictionary(lang);
  return { title: dict.packs.title, description: dict.packs.subtitle };
}

export default async function PointsPage({ params }: PageProps<"/[lang]/points">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  const dict = await getDictionary(lang);
  const packs = await getPointPacks();

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 px-4 py-8 sm:px-6 sm:py-12">
      <header>
        <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl">
          {dict.packs.title}
        </h1>
        <p className="mt-1 text-base text-pretty text-ink-soft">{dict.packs.subtitle}</p>
      </header>

      {/* The shop reads the payment outcome from the URL, and that needs a
          boundary or the whole page would give up being prerendered. */}
      <Suspense fallback={null}>
        <PointsShop packs={packs} />
      </Suspense>
    </div>
  );
}
