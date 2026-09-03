"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { PuzzleMark } from "@/components/site/logo";
import { useI18n } from "@/i18n/provider";

export function SiteFooter() {
  const { dict, locale } = useI18n();
  const pathname = usePathname();

  // The board takes over the whole screen.
  if (pathname.includes("/play/")) return null;

  const links = [
    { href: `/${locale}/privacy`, label: dict.nav.privacy },
    { href: `/${locale}/terms`, label: dict.nav.terms },
  ];

  return (
    // The bottom nav is fixed and overlaps whatever the page would otherwise
    // show underneath it. This padding belongs to the footer's own box —
    // its background extends down and blurs through the nav's translucent
    // bar — rather than sitting in a separate spacer after it, which used to
    // leave a gap of bare page background between the two.
    <footer className="border-t border-line/70 px-4 pt-6 pb-28 sm:px-6 md:pb-6">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-center gap-x-5 gap-y-2 text-center">
        <span className="inline-flex items-center gap-1.5 font-display text-sm font-bold text-ink-soft">
          <PuzzleMark className="size-4" />
          {dict.common.appName}
        </span>
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="text-sm text-ink-soft underline-offset-4 transition-colors hover:text-ink hover:underline"
          >
            {link.label}
          </Link>
        ))}
      </div>
    </footer>
  );
}
