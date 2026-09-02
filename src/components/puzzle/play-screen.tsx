"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { Confetti } from "@/components/puzzle/confetti";
import { Button, buttonClass } from "@/components/ui/button";
import { CoinIcon } from "@/components/ui/coin";
import type { Puzzle } from "@/data/catalog";
import { useCatalogue } from "@/data/catalogue-provider";
import { t } from "@/i18n/config";
import { useI18n } from "@/i18n/provider";
import { formatSeconds, getDifficulty, type DifficultyId } from "@/lib/points";
import { PuzzleEngine } from "@/lib/puzzle/engine";
import { hashSeed } from "@/lib/puzzle/geometry";
import { boardKey, clearBoard, loadBoard, saveBoard } from "@/lib/puzzle/storage";
import { useGame } from "@/lib/progress";

type Result = { seconds: number; earned: number; isBest: boolean };

export function PlayScreen({
  puzzle,
  difficultyId,
}: {
  puzzle: Puzzle;
  difficultyId: DifficultyId;
}) {
  const { dict, locale } = useI18n();
  const { ready, isUnlocked, registerCompletion, rememberLastPlayed } = useGame();
  const router = useRouter();
  const { nextPuzzle } = useCatalogue();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<PuzzleEngine | null>(null);
  const completeRef = useRef<(seconds: number) => void>(() => {});
  const soundRef = useRef(true);

  const [loading, setLoading] = useState(true);
  const [placed, setPlaced] = useState(0);
  const [total, setTotal] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [preview, setPreview] = useState(false);
  const [sound, setSound] = useState(true);
  const [result, setResult] = useState<Result | null>(null);

  const difficulty = getDifficulty(difficultyId);
  const key = boardKey(puzzle.id, difficulty.id);
  const following = nextPuzzle(puzzle) ?? puzzle;

  // Locked pictures are not playable — bounce back to the detail page.
  useEffect(() => {
    if (ready && !isUnlocked(puzzle)) router.replace(`/${locale}/puzzle/${puzzle.id}`);
  }, [isUnlocked, locale, puzzle, ready, router]);

  useEffect(() => {
    rememberLastPlayed(puzzle.id, difficulty.id);
    // Only when the board identity changes, not on every store update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [puzzle.id, difficulty.id]);

  useEffect(() => {
    completeRef.current = async (secs: number) => {
      clearBoard(key);
      const outcome = await registerCompletion(puzzle.id, difficulty.id, secs);
      setResult({ seconds: secs, earned: outcome.earned, isBest: outcome.isBest });
    };
  }, [difficulty.id, key, puzzle.id, registerCompletion]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let engine: PuzzleEngine | null = null;
    let cancelled = false;
    setLoading(true);

    const image = new Image();
    image.decoding = "async";
    // Storage serves the pictures from another origin. Asking for them
    // anonymously keeps the canvas untainted, which matters because the engine
    // draws every piece through offscreen canvases.
    image.crossOrigin = "anonymous";

    const start = () => {
      if (cancelled) return;
      engine = new PuzzleEngine({
        canvas,
        image,
        rows: difficulty.rows,
        cols: difficulty.cols,
        seed: hashSeed(`${puzzle.id}:${difficulty.id}`),
        sound: soundRef.current,
        onProgress: (count) => setPlaced(count),
        onComplete: () => completeRef.current(engine?.getSeconds() ?? 0),
        onChange: () => {
          // A finished board is cleared, not saved — otherwise the next visit
          // would restore an already-solved picture.
          if (engine && engine.placed < engine.total) saveBoard(key, engine.serialize());
        },
      });

      const saved = loadBoard(key);
      if (saved && !engine.restore(saved)) clearBoard(key);
      if (engine.placed === engine.total) {
        clearBoard(key);
        engine.reset();
      }

      engineRef.current = engine;
      if (process.env.NODE_ENV === "development") {
        (window as unknown as { __puzzleEngine?: PuzzleEngine }).__puzzleEngine = engine;
      }
      setTotal(engine.total);
      setPlaced(engine.placed);
      setSeconds(engine.getSeconds());
      setLoading(false);
    };

    image.onload = start;
    image.onerror = () => setLoading(false);
    image.src = puzzle.image;
    if (image.complete && image.naturalWidth > 0) start();

    return () => {
      cancelled = true;
      if (engine) {
        if (engine.placed < engine.total) saveBoard(key, engine.serialize());
        engine.destroy();
      }
      engineRef.current = null;
    };
  }, [difficulty.cols, difficulty.id, difficulty.rows, key, puzzle.id, puzzle.image]);

  useEffect(() => {
    if (result) return;
    const id = window.setInterval(() => {
      setSeconds(engineRef.current?.getSeconds() ?? 0);
    }, 500);
    return () => window.clearInterval(id);
  }, [result]);

  const toggleSound = useCallback(() => {
    setSound((prev) => {
      soundRef.current = !prev;
      engineRef.current?.setSound(!prev);
      return !prev;
    });
  }, []);

  const togglePreview = useCallback(() => {
    setPreview((prev) => {
      engineRef.current?.setPreview(!prev);
      return !prev;
    });
  }, []);

  function playAgain() {
    clearBoard(key);
    engineRef.current?.reset();
    setResult(null);
    setPlaced(0);
    setSeconds(0);
  }

  const progress = total > 0 ? (placed / total) * 100 : 0;

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-paper">
      {/* ------------------------------------------------------------- HUD */}
      <div className="flex h-14 shrink-0 items-center gap-2 border-b border-line bg-surface/90 px-2 backdrop-blur-md sm:px-4">
        <Link
          href={`/${locale}/puzzle/${puzzle.id}`}
          aria-label={dict.game.exit}
          className="grid size-10 shrink-0 place-items-center rounded-full border border-line bg-surface text-ink"
        >
          ←
        </Link>

        <p className="hidden min-w-0 truncate font-display text-base font-bold text-ink sm:block">
          {t(puzzle.title, locale)}
        </p>

        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          <span className="shrink-0 rounded-full bg-surface-2 px-2.5 py-1 font-display text-sm font-bold whitespace-nowrap text-ink tabular-nums">
            ⏱ {formatSeconds(seconds)}
          </span>
          <span className="shrink-0 rounded-full bg-surface-2 px-2.5 py-1 font-display text-sm font-bold whitespace-nowrap text-ink tabular-nums">
            🧩 {placed}/{total}
          </span>

          <HudButton active={preview} onClick={togglePreview} label={dict.game.preview}>
            👁
          </HudButton>
          <HudButton active={sound} onClick={toggleSound} label={dict.game.sound}>
            {sound ? "🔊" : "🔇"}
          </HudButton>
          <HudButton onClick={() => engineRef.current?.scatter()} label={dict.game.shuffle}>
            🔀
          </HudButton>
          <div className="hidden items-center gap-1.5 sm:flex">
            <HudButton onClick={() => engineRef.current?.zoomBy(1 / 1.25)} label={dict.game.zoomOut}>
              −
            </HudButton>
            <HudButton onClick={() => engineRef.current?.zoomBy(1.25)} label={dict.game.zoomIn}>
              +
            </HudButton>
          </div>
          <HudButton onClick={() => engineRef.current?.fit()} label={dict.game.fit}>
            ⛶
          </HudButton>
        </div>
      </div>

      <div className="h-1 shrink-0 bg-surface-2">
        <div
          className="h-full rounded-r-full bg-primary transition-[width] duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* ----------------------------------------------------------- board */}
      <div className="relative flex-1">
        <canvas ref={canvasRef} className="absolute inset-0 size-full" />

        {loading && (
          <div className="absolute inset-0 grid place-items-center bg-paper">
            <p className="animate-float font-display text-lg font-bold text-ink-soft">
              🧩 {dict.game.loadingImage}
            </p>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------- win */}
      {result && (
        <>
          <Confetti />
          <div className="fixed inset-0 z-50 grid place-items-center bg-[color-mix(in_srgb,var(--ink)_50%,transparent)] p-4">
            <div className="card-soft w-full max-w-sm animate-pop-in space-y-4 p-6 text-center">
              <p className="text-5xl">🎉</p>
              <h2 className="font-display text-2xl font-bold text-ink">{dict.win.title}</h2>
              <p className="text-ink-soft">{dict.win.subtitle}</p>

              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-3xl bg-surface-2 p-3">
                  <p className="font-display text-xl font-bold text-ink tabular-nums">
                    {formatSeconds(result.seconds)}
                  </p>
                  <p className="text-xs text-ink-soft">{dict.win.time}</p>
                </div>
                <div className="rounded-3xl bg-surface-2 p-3">
                  <p className="inline-flex items-center gap-1 font-display text-xl font-bold text-ink">
                    <CoinIcon className="size-5" />+{result.earned}
                  </p>
                  <p className="text-xs text-ink-soft">{dict.win.earned}</p>
                </div>
              </div>

              {result.isBest && (
                <p className="font-display text-sm font-bold text-mint-ink">⭐ {dict.win.newBest}</p>
              )}

              <div className="flex flex-col gap-4">
                <Link
                  href={`/${locale}/puzzle/${following.id}`}
                  className={buttonClass("primary", "md", "w-full")}
                >
                  {dict.win.next}
                </Link>
                <div className="flex gap-2">
                  <Button variant="soft" className="flex-1" onClick={playAgain}>
                    {dict.win.again}
                  </Button>
                  <Link
                    href={`/${locale}/category/${puzzle.categoryId}`}
                    className={buttonClass("soft", "md", "flex-1")}
                  >
                    {dict.win.toCategory}
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function HudButton({
  children,
  onClick,
  label,
  active = false,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={`grid size-10 shrink-0 place-items-center rounded-full border text-base transition-colors ${
        active ? "border-primary bg-surface-2 text-primary" : "border-line bg-surface text-ink"
      }`}
    >
      {children}
    </button>
  );
}
