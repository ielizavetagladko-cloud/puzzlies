export function PuzzleMark({ className = "size-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden className={className}>
      <defs>
        <linearGradient id="mark-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--lilac)" />
          <stop offset="100%" stopColor="var(--sky)" />
        </linearGradient>
      </defs>
      <path
        d="M8 12a4 4 0 0 1 4-4h6.5c0-3 2.4-4.6 5.5-4.6S29.5 5 29.5 8H36a4 4 0 0 1 4 4v6.5c3 0 4.6 2.4 4.6 5.5S43 29.5 40 29.5V36a4 4 0 0 1-4 4h-6.5c0 3-2.4 4.6-5.5 4.6S18.5 43 18.5 40H12a4 4 0 0 1-4-4v-6.5c-3 0-4.6-2.4-4.6-5.5S5 18.5 8 18.5V12Z"
        fill="url(#mark-g)"
      />
      <path
        d="M18 20.5c0-1.4 1.1-2.5 2.5-2.5h7c1.4 0 2.5 1.1 2.5 2.5v7c0 1.4-1.1 2.5-2.5 2.5h-7c-1.4 0-2.5-1.1-2.5-2.5v-7Z"
        fill="var(--surface)"
        opacity=".75"
      />
    </svg>
  );
}
