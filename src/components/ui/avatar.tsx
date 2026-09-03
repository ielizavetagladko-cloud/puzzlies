import type { CSSProperties } from "react";

/**
 * The avatars players can pick from.
 *
 * Drawn here rather than uploaded: a picture shown to every other player is a
 * moderation duty, and a small game has nobody to keep that watch. A fixed set
 * also stays in the pastel palette instead of fighting it.
 *
 * Ids are stored in the database, so never rename one — a renamed id silently
 * turns into the blank fallback for everyone who chose it.
 */

const MOTIFS = {
  puzzle: (
    <path d="M24 13c2.6 0 4 1.4 4 3.2 0 .6-.2 1-.2 1.5h4.5c1 0 1.7.7 1.7 1.7v4.4c.5 0 1-.2 1.6-.2 1.8 0 3.2 1.4 3.2 4s-1.4 4-3.2 4c-.6 0-1-.2-1.6-.2v4.4c0 1-.7 1.7-1.7 1.7H16c-1 0-1.7-.7-1.7-1.7V20.4c0-1 .7-1.7 1.7-1.7h4.2c0-.5-.2-.9-.2-1.5 0-1.8 1.4-3.2 4-3.2Z" />
  ),
  cat: (
    <>
      <path d="M15 24.5 17.5 12.5 27 20.5 15 24.5Zm18 0-2.5-12L21 20.5l12 4Z" />
      <circle cx="24" cy="28" r="10.5" />
      {/* Knocked out of the head, so the ink shape reads as a face. */}
      <circle cx="20.3" cy="27" r="1.8" fill="var(--av-back)" />
      <circle cx="27.7" cy="27" r="1.8" fill="var(--av-back)" />
    </>
  ),
  flower: (
    <>
      <circle cx="24" cy="15.5" r="6" />
      <circle cx="32.5" cy="21.5" r="6" />
      <circle cx="29.2" cy="31.5" r="6" />
      <circle cx="18.8" cy="31.5" r="6" />
      <circle cx="15.5" cy="21.5" r="6" />
    </>
  ),
  star: <path d="M24 11.5l4.1 8.6 9.4 1.3-6.8 6.7 1.6 9.4-8.3-4.5-8.3 4.5 1.6-9.4-6.8-6.7 9.4-1.3L24 11.5Z" />,
  cloud: (
    <path d="M17.5 34a7 7 0 0 1-.6-14 9 9 0 0 1 16.8 1.6A6.2 6.2 0 0 1 32.5 34h-15Z" />
  ),
  heart: (
    <path d="M24 37S11.5 29.4 11.5 21.4A6.9 6.9 0 0 1 24 17.3a6.9 6.9 0 0 1 12.5 4.1C36.5 29.4 24 37 24 37Z" />
  ),
} as const;

type Motif = keyof typeof MOTIFS;

/** Background, then the motif drawn on top of it. */
const PALETTE = [
  ["--lilac", "--lilac-ink"],
  ["--peach", "--peach-ink"],
  ["--mint", "--mint-ink"],
  ["--sky", "--sky-ink"],
  ["--blush", "--blush-ink"],
  ["--lemon", "--coin-deep"],
] as const;

function build() {
  const motifs = Object.keys(MOTIFS) as Motif[];
  const list: { id: string; motif: Motif; back: string; ink: string }[] = [];

  for (const [index, motif] of motifs.entries()) {
    // Two colourways each, taken from opposite ends so neighbours in the grid
    // never look like the same avatar twice.
    for (const step of [0, 3]) {
      const [back, ink] = PALETTE[(index + step) % PALETTE.length];
      list.push({ id: `${motif}-${step}`, motif, back, ink });
    }
  }
  return list;
}

export const AVATARS = build();

export function Avatar({ id, className = "size-9" }: { id: string | null; className?: string }) {
  const found = AVATARS.find((one) => one.id === id);

  return (
    <svg
      viewBox="0 0 48 48"
      aria-hidden
      className={`${className} shrink-0 rounded-full`}
      // Motifs that cut shapes out of themselves need the background colour.
      style={{ "--av-back": found ? `var(${found.back})` : "var(--surface-2)" } as CSSProperties}
    >
      <rect
        width="48"
        height="48"
        rx="24"
        fill={found ? `var(${found.back})` : "var(--surface-2)"}
      />
      <g fill={found ? `var(${found.ink})` : "var(--locked)"}>
        {found ? MOTIFS[found.motif] : <circle cx="24" cy="24" r="7" />}
      </g>
    </svg>
  );
}
