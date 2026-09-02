"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";

import type { Category, Puzzle } from "@/data/catalog";

/**
 * The catalogue the server already loaded, handed to client components so they
 * do not each fetch it again. The layout is the only place that fills it.
 */

type CatalogueValue = {
  categories: Category[];
  puzzles: Puzzle[];
  getPuzzle: (id: string) => Puzzle | undefined;
  getCategory: (slug: string) => Category | undefined;
  puzzlesOf: (categoryId: string) => Puzzle[];
  nextPuzzle: (current: Puzzle) => Puzzle | undefined;
};

const CatalogueContext = createContext<CatalogueValue | null>(null);

export function CatalogueProvider({
  categories,
  puzzles,
  children,
}: {
  categories: Category[];
  puzzles: Puzzle[];
  children: ReactNode;
}) {
  const value = useMemo<CatalogueValue>(() => {
    const puzzlesOf = (categoryId: string) =>
      puzzles.filter((puzzle) => puzzle.categoryId === categoryId);

    return {
      categories,
      puzzles,
      puzzlesOf,
      getPuzzle: (id) => puzzles.find((puzzle) => puzzle.id === id),
      getCategory: (slug) => categories.find((category) => category.slug === slug),
      nextPuzzle: (current) => {
        const list = puzzlesOf(current.categoryId);
        if (list.length === 0) return undefined;
        const index = list.findIndex((puzzle) => puzzle.id === current.id);
        return list[(index + 1) % list.length];
      },
    };
  }, [categories, puzzles]);

  return <CatalogueContext.Provider value={value}>{children}</CatalogueContext.Provider>;
}

export function useCatalogue() {
  const context = useContext(CatalogueContext);
  if (!context) throw new Error("useCatalogue must be used inside <CatalogueProvider>");
  return context;
}
