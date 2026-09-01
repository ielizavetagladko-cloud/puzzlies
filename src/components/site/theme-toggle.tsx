"use client";

import { useSyncExternalStore } from "react";

import { useI18n } from "@/i18n/provider";

type Theme = "light" | "dark";

const KEY = "puzzlies.theme";

const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** The document element is the source of truth — an inline script sets it before paint. */
function getTheme(): Theme {
  const attribute = document.documentElement.getAttribute("data-theme");
  if (attribute === "dark" || attribute === "light") return attribute;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function getServerTheme(): Theme {
  return "light";
}

function applyTheme(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
  try {
    window.localStorage.setItem(KEY, theme);
  } catch {
    /* ignore */
  }
  for (const listener of listeners) listener();
}

export function ThemeToggle() {
  const { dict } = useI18n();
  const theme = useSyncExternalStore(subscribe, getTheme, getServerTheme);

  return (
    <button
      type="button"
      onClick={() => applyTheme(theme === "dark" ? "light" : "dark")}
      title={dict.nav.theme}
      aria-label={dict.nav.theme}
      className="grid size-10 place-items-center rounded-full border border-line bg-surface text-ink transition-transform hover:-translate-y-0.5 active:translate-y-0"
    >
      {theme === "dark" ? (
        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="12" cy="12" r="4.2" />
          <path
            d="M12 2.6v2.2M12 19.2v2.2M2.6 12h2.2M19.2 12h2.2M5.2 5.2l1.6 1.6M17.2 17.2l1.6 1.6M18.8 5.2l-1.6 1.6M6.8 17.2l-1.6 1.6"
            strokeLinecap="round"
          />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M20 14.4A8.4 8.4 0 0 1 9.6 4a8.4 8.4 0 1 0 10.4 10.4Z" strokeLinejoin="round" />
        </svg>
      )}
    </button>
  );
}
