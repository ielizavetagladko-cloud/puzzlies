const COLORS = ["var(--mint)", "var(--peach)", "var(--lilac)", "var(--sky)", "var(--blush)", "var(--coin)"];

/** Purely decorative burst shown on the win screen. */
export function Confetti({ count = 40 }: { count?: number }) {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-40 overflow-hidden">
      {Array.from({ length: count }, (_, index) => {
        const left = (index * 97) % 100;
        const delay = ((index * 37) % 100) / 100;
        const duration = 2.4 + (((index * 53) % 100) / 100) * 1.8;
        const drift = (((index * 71) % 100) / 100) * 120 - 60;
        const size = 7 + ((index * 13) % 8);
        return (
          <span
            key={index}
            className="absolute top-0 block"
            style={{
              left: `${left}%`,
              width: size,
              height: size * 1.6,
              borderRadius: index % 3 === 0 ? "50%" : "3px",
              background: COLORS[index % COLORS.length],
              animation: `confetti-fall ${duration}s ${delay}s cubic-bezier(.3,.6,.5,1) forwards`,
              ["--drift" as string]: `${drift}px`,
            }}
          />
        );
      })}
    </div>
  );
}
