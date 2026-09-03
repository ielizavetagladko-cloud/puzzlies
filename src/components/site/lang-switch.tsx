"use client";

import { usePathname, useRouter } from "next/navigation";

import { locales, type Locale } from "@/i18n/config";
import { useI18n } from "@/i18n/provider";

/** Remembers the choice so the proxy redirect lands on the same language next time. */
function rememberLocale(next: Locale) {
  try {
    document.cookie = `lang=${next};path=/;max-age=31536000;samesite=lax`;
  } catch {
    /* ignore */
  }
}

export function LangSwitch() {
  const { locale } = useI18n();
  const pathname = usePathname();
  const router = useRouter();

  function switchTo(next: Locale) {
    if (next === locale) return;
    rememberLocale(next);
    const segments = pathname.split("/");
    segments[1] = next;
    router.push(segments.join("/") || `/${next}`);
  }

  return (
    <div className="flex h-10 items-center rounded-full border border-line bg-surface p-1">
      {locales.map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => switchTo(item)}
          aria-pressed={item === locale}
          className={`h-8 rounded-full px-2.5 font-display text-sm font-semibold uppercase transition-colors ${
            item === locale ? "bg-primary text-primary-on" : "text-ink-soft hover:text-ink"
          }`}
        >
          {item}
        </button>
      ))}
    </div>
  );
}
