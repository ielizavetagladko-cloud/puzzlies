"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { LangSwitch } from "@/components/site/lang-switch";
import { PuzzleMark } from "@/components/site/logo";
import { ThemeToggle } from "@/components/site/theme-toggle";
import { buttonClass } from "@/components/ui/button";
import { PointsPill } from "@/components/ui/coin";
import { useI18n } from "@/i18n/provider";
import { useAuth } from "@/lib/auth";
import { useGame } from "@/lib/progress";

export function SiteHeader() {
  const { dict, locale } = useI18n();
  const { state, ready } = useGame();
  const { user, ready: authReady } = useAuth();
  const pathname = usePathname();

  // The board takes over the whole screen — it draws its own compact bar.
  if (pathname.includes("/play/")) return null;

  const links = [
    { href: `/${locale}`, label: dict.nav.home },
    { href: `/${locale}#categories`, label: dict.nav.categories },
    { href: `/${locale}/leaderboard`, label: dict.nav.leaderboard },
    { href: `/${locale}/profile`, label: dict.nav.profile },
  ];

  return (
    <header className="sticky top-0 z-30 border-b border-line/70 bg-paper/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-3 px-4 sm:px-6">
        <Link href={`/${locale}`} className="flex items-center gap-2">
          <PuzzleMark className="size-9 animate-float" />
          <span className="hidden font-display text-xl font-bold text-ink sm:block">
            {dict.common.appName}
          </span>
        </Link>

        <nav className="ml-4 hidden items-center gap-1 md:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-full px-3.5 py-2 font-display text-sm font-semibold text-ink-soft transition-colors hover:bg-surface-2 hover:text-ink"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <PointsPill
            value={ready ? state.points : "—"}
            className={ready ? "animate-shine" : "opacity-60"}
          />

          {authReady &&
            (user ? (
              <Link
                href={`/${locale}/profile`}
                title={user.email}
                aria-label={user.email}
                className="grid size-10 shrink-0 place-items-center rounded-full bg-lilac font-display font-bold text-lilac-ink transition-transform hover:-translate-y-0.5"
              >
                {user.email.slice(0, 1).toUpperCase()}
              </Link>
            ) : (
              <Link
                href={`/${locale}/signin`}
                className={buttonClass("soft", "sm", "hidden sm:inline-flex")}
              >
                {dict.auth.signIn}
              </Link>
            ))}

          <div className="hidden sm:block">
            <LangSwitch />
          </div>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
