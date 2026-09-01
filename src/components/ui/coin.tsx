export function CoinIcon({ className = "size-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className}>
      <circle cx="12" cy="12" r="10" fill="var(--coin)" />
      <circle cx="12" cy="12" r="10" fill="none" stroke="var(--coin-deep)" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="6.5" fill="none" stroke="var(--coin-deep)" strokeWidth="1.2" opacity=".7" />
      <path d="M9.6 9.2h3.2a2.2 2.2 0 0 1 0 4.4H9.6V9.2Zm0 4.4V16" fill="none" stroke="#7a5b06" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function PointsPill({
  value,
  className = "",
  size = "md",
}: {
  value: number | string;
  className?: string;
  size?: "sm" | "md";
}) {
  const box = size === "sm" ? "h-7 px-2.5 text-sm gap-1" : "h-9 px-3.5 text-base gap-1.5";
  return (
    <span
      className={`inline-flex items-center rounded-full bg-surface border border-line font-display font-semibold text-ink ${box} ${className}`}
    >
      <CoinIcon className={size === "sm" ? "size-4" : "size-5"} />
      {value}
    </span>
  );
}
