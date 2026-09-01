"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { LangSwitch } from "@/components/site/lang-switch";
import { useI18n } from "@/i18n/provider";

export function BottomNav() {
  const { dict, locale } = useI18n();
  const pathname = usePathname();

  if (pathname.includes("/play/")) return null;

  const home = `/${locale}`;
  const profile = `/${locale}/profile`;

  const items = [
    {
      href: home,
      label: dict.nav.home,
      active: pathname === home,
      icon: (
        <path d="M4 11.2 12 4.6l8 6.6V19a1.4 1.4 0 0 1-1.4 1.4h-4.2v-5.2h-4.8v5.2H5.4A1.4 1.4 0 0 1 4 19v-7.8Z" />
      ),
    },
    {
      href: `${home}#categories`,
      label: dict.nav.categories,
      active: pathname.includes("/category/"),
      icon: (
        <path d="M4.5 4.5h6v6h-6v-6Zm9 0h6v6h-6v-6Zm-9 9h6v6h-6v-6Zm9 0h6v6h-6v-6Z" />
      ),
    },
    {
      href: profile,
      label: dict.nav.profile,
      active: pathname === profile,
      icon: (
        <path d="M12 12.2a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0 1.8c-3.6 0-6.5 2-6.5 4.4v1.2h13v-1.2c0-2.4-2.9-4.4-6.5-4.4Z" />
      ),
    },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-paper/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden">
      <div className="flex items-center justify-around px-2 py-1.5">
        {items.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className={`flex min-w-16 flex-col items-center gap-0.5 rounded-2xl px-3 py-1.5 font-display text-[11px] font-semibold transition-colors ${
              item.active ? "bg-surface-2 text-primary" : "text-ink-soft"
            }`}
          >
            <svg viewBox="0 0 24 24" className="size-6" fill="currentColor">
              {item.icon}
            </svg>
            {item.label}
          </Link>
        ))}
        <div className="scale-90">
          <LangSwitch />
        </div>
      </div>
    </nav>
  );
}
