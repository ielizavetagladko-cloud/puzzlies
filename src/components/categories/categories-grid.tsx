import Image from "next/image";
import Link from "next/link";

import type { Category, Puzzle } from "@/data/catalog";
import { accentClasses } from "@/data/catalog";
import type { Dict, Locale } from "@/i18n/config";
import { t } from "@/i18n/config";

export function CategoriesGrid({
  categories,
  puzzles,
  lang,
  dict,
}: {
  categories: Category[];
  puzzles: Puzzle[];
  lang: Locale;
  dict: Dict;
}) {
  return (
    // Two columns and the thumbnail strip used to both switch on at the same
    // 640px breakpoint, so a tablet-width card had to fit a title, a blurb,
    // and three thumbnails in about 350px — titles wrapped three lines deep
    // and ran into the thumbnails next to them. The grid now waits for lg
    // (1024px), so every card stays full width — room for both — right up
    // until there is genuinely space to split into two.
    <div className="grid gap-3 lg:grid-cols-2">
      {categories.map((category) => {
        const list = puzzles.filter((puzzle) => puzzle.categoryId === category.id);
        const accent = accentClasses[category.accent];
        return (
          <Link
            key={category.id}
            href={`/${lang}/category/${category.slug}`}
            className="card-soft group flex items-center gap-4 overflow-hidden p-3 transition-transform duration-200 hover:-translate-y-1"
          >
            <span
              className={`grid size-16 shrink-0 place-items-center rounded-3xl text-3xl ${accent.bg}`}
            >
              {category.icon}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-display text-lg font-bold text-ink">
                {t(category.title, lang)}
              </span>
              <span className="block truncate text-sm text-ink-soft">
                {t(category.blurb, lang)}
              </span>
              <span className={`mt-1 inline-block font-display text-xs font-bold ${accent.text}`}>
                {list.length} {dict.category.puzzles}
              </span>
            </span>
            <span className="hidden shrink-0 gap-1 sm:flex">
              {list.slice(0, 3).map((puzzle) => (
                <span
                  key={puzzle.id}
                  className="relative size-14 overflow-hidden rounded-2xl border border-line"
                >
                  <Image
                    src={puzzle.image}
                    alt=""
                    fill
                    sizes="56px"
                    className="object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                </span>
              ))}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
