import type { Dict } from "@/i18n/config";

export type DifficultyId = "easy" | "medium" | "hard" | "expert";

export type Difficulty = {
  id: DifficultyId;
  cols: number;
  rows: number;
  pieces: number;
  /** Base points for the first completion. */
  reward: number;
  /** Seconds under which the full speed bonus is granted. */
  parSeconds: number;
};

/** Grids follow the 4:3 aspect of the catalog images. */
export const DIFFICULTIES: Difficulty[] = [
  { id: "easy", cols: 4, rows: 3, pieces: 12, reward: 10, parSeconds: 45 },
  { id: "medium", cols: 8, rows: 6, pieces: 48, reward: 30, parSeconds: 240 },
  { id: "hard", cols: 12, rows: 9, pieces: 108, reward: 60, parSeconds: 700 },
  { id: "expert", cols: 20, rows: 15, pieces: 300, reward: 150, parSeconds: 2100 },
];

export const DEFAULT_DIFFICULTY: DifficultyId = "medium";

export function getDifficulty(id: string | undefined): Difficulty {
  return DIFFICULTIES.find((d) => d.id === id) ?? DIFFICULTIES[1];
}

export function difficultyLabel(dict: Dict, id: DifficultyId) {
  return dict.difficulty[id];
}

/**
 * What a board is worth the second time round: a fifth, so the same easy
 * picture cannot be farmed for points.
 */
export function replayReward(difficulty: Difficulty) {
  return Math.max(1, Math.round(difficulty.reward * 0.2));
}

/** Points given for finishing a board. */
export function computeReward(difficulty: Difficulty, seconds: number, firstTime: boolean) {
  if (!firstTime) return replayReward(difficulty);

  const speed = Math.max(0, Math.min(1, 1 - seconds / difficulty.parSeconds));
  return difficulty.reward + Math.round(difficulty.reward * 0.5 * speed);
}

/** Everyone starts with enough points to unlock their first picture. */
export const WELCOME_POINTS = 200;

export function formatSeconds(total: number) {
  const seconds = Math.max(0, Math.floor(total));
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

/** Prices are always shown in dollars, so the US format reads the same in both languages. */
/**
 * How each currency is written.
 *
 * Ukrainian shops write "грн" rather than "₴"; to an English reader that says
 * nothing, so there it stays the code the payment page itself shows.
 */
function currencyLabel(currency: string, locale: string): string {
  if (currency === "UAH") return locale === "uk" ? "грн" : "UAH";
  if (currency === "USD") return "$";
  if (currency === "EUR") return "€";
  return currency;
}

/**
 * A price in the currency it will actually be charged in.
 *
 * Written by hand rather than through Intl's currency display, because that
 * display is not the same on both sides of the wire: Node renders UAH as "89 ₴"
 * and browsers as "89 грн", from different ICU data. Identical code producing
 * different text is a hydration mismatch on every price on the page.
 *
 * Whole hryvnia lose their kopiyky — "89 грн" is how a price is written in
 * Ukraine, while "$2" is not how one is written in English.
 */
export function formatPrice(minorUnits: number, currency = "UAH", locale = "uk") {
  const label = currencyLabel(currency, locale);
  const exact = minorUnits % 100 !== 0 || currency !== "UAH";
  const [whole, fraction] = (minorUnits / 100).toFixed(exact ? 2 : 0).split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, locale === "uk" ? "\u00a0" : ",");
  const number = fraction ? `${grouped}${locale === "uk" ? "," : "."}${fraction}` : grouped;
  // Hryvnia goes after the number; dollars and euro before it.
  return currency === "UAH" ? `${number}\u00a0${label}` : `${label}${number}`;
}

/** One unit of the currency, for the "N points per ..." line. */
export function formatUnit(currency = "UAH", locale = "uk") {
  const label = currencyLabel(currency, locale);
  return currency === "UAH" ? `1\u00a0${label}` : `${label}1`;
}

