import type { Localized } from "@/i18n/config";

/**
 * Demo catalog. When Supabase lands, these two exports are replaced by queries
 * against the `categories` / `puzzles` tables — the shapes below match the
 * planned columns on purpose.
 */

export type AccessType = "free" | "points" | "paid";

export type Accent = "mint" | "sky" | "lilac" | "peach" | "blush";

export type Category = {
  id: string;
  slug: string;
  title: Localized;
  blurb: Localized;
  icon: string;
  accent: Accent;
};

export type Puzzle = {
  id: string;
  categoryId: string;
  title: Localized;
  image: string;
  /** Intrinsic size of the file in /public — used to keep aspect ratio. */
  width: number;
  height: number;
  access: AccessType;
  /** Only for access === "points". */
  pointsCost?: number;
  /** Only for access === "paid". */
  priceCents?: number;
};

export const PAID_PRICE_CENTS = 125;

export const categories: Category[] = [
  {
    id: "nature",
    slug: "nature",
    title: { uk: "Природа", en: "Nature" },
    blurb: { uk: "Поля, квіти й тепле світло", en: "Fields, flowers and warm light" },
    icon: "🌿",
    accent: "mint",
  },
  {
    id: "water",
    slug: "water",
    title: { uk: "Вода", en: "Water" },
    blurb: { uk: "Море, озера й краплі", en: "Seas, lakes and droplets" },
    icon: "🌊",
    accent: "sky",
  },
  {
    id: "mountains",
    slug: "mountains",
    title: { uk: "Гори і небо", en: "Peaks & sky" },
    blurb: { uk: "Туман, зорі та висота", en: "Mist, stars and altitude" },
    icon: "🏔️",
    accent: "lilac",
  },
  {
    id: "city",
    slug: "city",
    title: { uk: "Місто і ретро", en: "City & retro" },
    blurb: { uk: "Вулиці, авто й вогні", en: "Streets, cars and lights" },
    icon: "🚗",
    accent: "peach",
  },
];

function img(id: number) {
  return `/puzzles/${id}.jpg`;
}

export const puzzles: Puzzle[] = [
  // ---------------------------------------------------------------- nature
  p("nature-blossom", "nature", { uk: "Весняне цвітіння", en: "Spring blossom" }, 106, "free"),
  p("nature-green-field", "nature", { uk: "Зелене поле", en: "Green field" }, 107, "free"),
  p("nature-garden", "nature", { uk: "Літній сад", en: "Summer garden" }, 127, "free"),
  p("nature-berries", "nature", { uk: "Малина на столі", en: "Berries on the table" }, 102, "points", 150),
  p("nature-morning", "nature", { uk: "Ранкова трава", en: "Morning grass" }, 109, "points", 200),
  p("nature-sunset", "nature", { uk: "Захід над полем", en: "Sunset over the field" }, 110, "points", 260),
  p("nature-wheat", "nature", { uk: "Колоски", en: "Wheat ears" }, 112, "points", 320),
  p("nature-tuscany", "nature", { uk: "Тосканська дорога", en: "Tuscan road" }, 116, "paid"),
  p("nature-sunflower", "nature", { uk: "Соняшник", en: "Sunflower" }, 118, "paid"),

  // ----------------------------------------------------------------- water
  p("water-turquoise", "water", { uk: "Бірюзове море", en: "Turquoise sea" }, 124, "free"),
  p("water-horizon", "water", { uk: "Тиха гладь", en: "Calm horizon" }, 135, "free"),
  p("water-waves", "water", { uk: "Хвилі", en: "Waves" }, 126, "points", 150),
  p("water-flight", "water", { uk: "Політ над морем", en: "Flight over the sea" }, 130, "points", 220),
  p("water-droplets", "water", { uk: "Краплі", en: "Droplets" }, 123, "points", 280),
  p("water-lake", "water", { uk: "Озеро в горах", en: "Mountain lake" }, 128, "points", 340),
  p("water-rocky", "water", { uk: "Скелястий берег", en: "Rocky shore" }, 132, "paid"),
  p("water-shell", "water", { uk: "Мушля", en: "Seashell" }, 139, "paid"),

  // ------------------------------------------------------------- mountains
  p("mountains-misty", "mountains", { uk: "Туманні пагорби", en: "Misty hills" }, 114, "free"),
  p("mountains-fog", "mountains", { uk: "Гірський туман", en: "Mountain fog" }, 121, "free"),
  p("mountains-shore", "mountains", { uk: "Береги озера", en: "Lake shores" }, 125, "points", 160),
  p("mountains-stone", "mountains", { uk: "Камʼяні велетні", en: "Stone giants" }, 136, "points", 230),
  p("mountains-stars", "mountains", { uk: "Зоряна ніч", en: "Starry night" }, 120, "points", 300),
  p("mountains-palm", "mountains", { uk: "Пальма на світанку", en: "Palm at dawn" }, 108, "points", 360),
  p("mountains-ice", "mountains", { uk: "Крижані краплі", en: "Frozen drops" }, 115, "paid"),
  p("mountains-blue", "mountains", { uk: "Синій вітер", en: "Blue wind" }, 113, "paid"),

  // ------------------------------------------------------------------ city
  p("city-retro-car", "city", { uk: "Ретро авто", en: "Retro car" }, 133, "free"),
  p("city-pickup", "city", { uk: "Старий пікап", en: "Old pickup" }, 111, "free"),
  p("city-bridge", "city", { uk: "Міст уночі", en: "Bridge at night" }, 122, "points", 170),
  p("city-arch", "city", { uk: "Дерев'яна арка", en: "Wooden arch" }, 134, "points", 240),
  p("city-dreamcatcher", "city", { uk: "Ловець снів", en: "Dreamcatcher" }, 104, "points", 300),
  p("city-crowd", "city", { uk: "Вогні концерту", en: "Concert lights" }, 117, "points", 380),
  p("city-bench", "city", { uk: "На лавці", en: "On the bench" }, 129, "paid"),
  p("city-tunnel", "city", { uk: "Світло в тунелі", en: "Light in the tunnel" }, 137, "paid"),
];

function p(
  id: string,
  categoryId: string,
  title: Localized,
  file: number,
  access: AccessType,
  pointsCost?: number,
): Puzzle {
  return {
    id,
    categoryId,
    title,
    image: img(file),
    width: 1200,
    height: 900,
    access,
    ...(access === "points" ? { pointsCost: pointsCost ?? 200 } : null),
    ...(access === "paid" ? { priceCents: PAID_PRICE_CENTS } : null),
  };
}

export function getCategory(slug: string) {
  return categories.find((c) => c.slug === slug);
}

export function getPuzzle(id: string) {
  return puzzles.find((puzzle) => puzzle.id === id);
}

export function puzzlesOf(categoryId: string) {
  return puzzles.filter((puzzle) => puzzle.categoryId === categoryId);
}

/** Next puzzle in the same category, wrapping around. */
export function nextPuzzle(current: Puzzle) {
  const list = puzzlesOf(current.categoryId);
  const index = list.findIndex((puzzle) => puzzle.id === current.id);
  return list[(index + 1) % list.length];
}

export const accentClasses: Record<Accent, { bg: string; text: string; ring: string }> = {
  mint: { bg: "bg-mint", text: "text-mint-ink", ring: "ring-mint" },
  sky: { bg: "bg-sky", text: "text-sky-ink", ring: "ring-sky" },
  lilac: { bg: "bg-lilac", text: "text-lilac-ink", ring: "ring-lilac" },
  peach: { bg: "bg-peach", text: "text-peach-ink", ring: "ring-peach" },
  blush: { bg: "bg-blush", text: "text-blush-ink", ring: "ring-blush" },
};
