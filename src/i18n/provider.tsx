"use client";

import { createContext, useContext, type ReactNode } from "react";

import type { Dict, Locale } from "./config";

type I18nValue = { dict: Dict; locale: Locale };

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ children, ...value }: I18nValue & { children: ReactNode }) {
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) throw new Error("useI18n must be used inside <I18nProvider>");
  return context;
}
