import Link from "next/link";

import type { LegalDocument } from "@/content/legal";
import { LAST_UPDATED } from "@/content/legal";
import type { Locale } from "@/i18n/config";

export function LegalPage({ document, lang }: { document: LegalDocument; lang: Locale }) {
  const updated = new Intl.DateTimeFormat(lang === "uk" ? "uk-UA" : "en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(LAST_UPDATED));

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8 sm:px-6 sm:py-12">
      <Link
        href={`/${lang}`}
        className="inline-flex items-center gap-1.5 font-display text-sm font-semibold text-ink-soft transition-colors hover:text-ink"
      >
        ← {lang === "uk" ? "На головну" : "Back home"}
      </Link>

      <header className="card-soft p-5 sm:p-7">
        <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl">{document.title}</h1>
        <p className="mt-1 text-xs text-ink-soft">
          {document.updatedLabel}: {updated}
        </p>
        <p className="mt-3 text-base text-pretty text-ink-soft">{document.intro}</p>
      </header>

      <div className="card-soft space-y-6 p-5 sm:p-7">
        {document.sections.map((section) => (
          <section key={section.heading} className="space-y-2">
            <h2 className="font-display text-lg font-bold text-ink">{section.heading}</h2>
            {section.body.map((paragraph) => (
              <p key={paragraph} className="text-sm leading-relaxed text-pretty text-ink-soft">
                {paragraph}
              </p>
            ))}
          </section>
        ))}
      </div>
    </div>
  );
}
