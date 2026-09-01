import type en from "./dictionaries/en.json";

export const locales = ["uk", "en"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "uk";

export type Dict = typeof en;

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

/** Localized field on catalog data, e.g. { uk: "Природа", en: "Nature" }. */
export type Localized = Record<Locale, string>;

export function t(value: Localized, locale: Locale): string {
  return value[locale] ?? value[defaultLocale];
}

/** Replaces {name} placeholders in a dictionary string. */
export function fmt(template: string, values: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );
}

export const localeNames: Record<Locale, string> = {
  uk: "Українська",
  en: "English",
};
