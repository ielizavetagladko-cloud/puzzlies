import "server-only";

import type { Dict, Locale } from "./config";

const loaders = {
  uk: () => import("./dictionaries/uk.json").then((m) => m.default as Dict),
  en: () => import("./dictionaries/en.json").then((m) => m.default as Dict),
} satisfies Record<Locale, () => Promise<Dict>>;

export function getDictionary(locale: Locale): Promise<Dict> {
  return loaders[locale]();
}
