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

// Most of these shapes were drawn free-hand and their own bounding box does
// not sit at (24,24) — a five-petal flower, say, has more weight above its
// centre than below. Each `translate` below is that shape's own measured
// offset, undone, so every motif lands in the middle of its circle rather
// than drifting toward one edge.
const MOTIFS = {
  // A rounded square with a bump on the top and the left, so the outline
  // reads as a single interlocking piece rather than an odd wedge on one
  // corner. getBBox() confirms it centres at (24,24).
  puzzle: (
    <path d="M20.1 17.1H21.9A4.2 4.2 0 0 1 30.3 17.1H32.1A3 3 0 0 1 35.1 20.1V32.1A3 3 0 0 1 32.1 35.1H20.1A3 3 0 0 1 17.1 32.1V30.3A4.2 4.2 0 0 1 17.1 21.9V20.1A3 3 0 0 1 20.1 17.1Z" />
  ),
  cat: (
    <g transform="translate(0 -1.5)">
      <path d="M15 24.5 17.5 12.5 27 20.5 15 24.5Zm18 0-2.5-12L21 20.5l12 4Z" />
      <circle cx="24" cy="28" r="10.5" />
      {/* Knocked out of the head, so the ink shape reads as a face. */}
      <circle cx="20.3" cy="27" r="1.8" fill="var(--av-back)" />
      <circle cx="27.7" cy="27" r="1.8" fill="var(--av-back)" />
    </g>
  ),
  flower: (
    <g transform="translate(0 0.5)">
      <circle cx="24" cy="15.5" r="6" />
      <circle cx="32.5" cy="21.5" r="6" />
      <circle cx="29.2" cy="31.5" r="6" />
      <circle cx="18.8" cy="31.5" r="6" />
      <circle cx="15.5" cy="21.5" r="6" />
    </g>
  ),
  star: (
    <g transform="translate(0 -0.5)">
      <path d="M24 11.5l4.1 8.6 9.4 1.3-6.8 6.7 1.6 9.4-8.3-4.5-8.3 4.5 1.6-9.4-6.8-6.7 9.4-1.3L24 11.5Z" />
    </g>
  ),
  cloud: (
    <g transform="translate(-0.8 -0.5)">
      <path d="M17.5 34a7 7 0 0 1-.6-14 9 9 0 0 1 16.8 1.6A6.2 6.2 0 0 1 32.5 34h-15Z" />
    </g>
  ),
  heart: (
    <g transform="translate(0 -1.7)">
      <path d="M24 37S11.5 29.4 11.5 21.4A6.9 6.9 0 0 1 24 17.3a6.9 6.9 0 0 1 12.5 4.1C36.5 29.4 24 37 24 37Z" />
    </g>
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
