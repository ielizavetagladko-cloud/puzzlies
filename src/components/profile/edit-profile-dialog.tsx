"use client";

import { useEffect, useState } from "react";

import { Avatar, AVATARS } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { fmt } from "@/i18n/config";
import { useI18n } from "@/i18n/provider";
import { saveLook, useLook } from "@/lib/leaderboard";

/** Longer than this and the leaderboard row becomes a name and nothing else. */
const MAX_LENGTH = 24;
/** Must match --animate-shrink-out, or the panel would vanish mid-animation. */
const EXIT_MS = 220;

/**
 * How the player appears on the leaderboard, edited from a dialog reached by
 * the pencil next to the account email.
 *
 * Nobody is identifiable on the board until they fill this in: without a name
 * a player is a scrap of hash. So it is offered, never assumed, and the email
 * — which the account actually has — is never a candidate.
 */
export function EditProfileDialog({ onClose }: { onClose: () => void }) {
  const { dict } = useI18n();
  const look = useLook();

  const [typed, setTyped] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const name = typed ?? look.name ?? "";

  function close() {
    setLeaving(true);
  }

  useEffect(() => {
    if (!leaving) return;
    const exit = setTimeout(onClose, EXIT_MS);
    return () => clearTimeout(exit);
  }, [leaving, onClose]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") close();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  async function saveName() {
    setBusy(true);
    const ok = await saveLook({ name });
    setBusy(false);
    setSaved(ok);
  }

  async function pick(avatar: string) {
    setBusy(true);
    // Picking is the whole gesture — there is nothing to confirm afterwards.
    // Choosing the current one again clears it.
    await saveLook({ avatar: look.avatar === avatar ? null : avatar });
    setBusy(false);
  }

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${
        leaving ? "animate-fade-out" : "animate-fade-in"
      }`}
    >
      {/* Dismissing by clicking away is expected of a dialog this small. The
          scrim is built from --shadow-rgb, which is dark in both themes; --ink
          is near-white in the dark one and would veil the page in white. */}
      <button
        type="button"
        aria-label={dict.common.close}
        onClick={close}
        className="absolute inset-0 cursor-default bg-[rgb(var(--shadow-rgb)/0.45)] backdrop-blur-sm"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={dict.board.nameTitle}
        className={`card-soft relative max-h-full w-full max-w-md space-y-4 overflow-y-auto p-6 ${
          leaving ? "animate-shrink-out" : "animate-grow-in"
        }`}
      >
        {/* Clicking away and Escape both close this, but neither is visible. */}
        <button
          type="button"
          aria-label={dict.common.close}
          onClick={close}
          className="absolute end-3 top-3 grid size-9 place-items-center rounded-full text-ink-soft transition-colors hover:bg-surface-2 hover:text-ink focus-visible:bg-surface-2 focus-visible:text-ink"
        >
          <svg viewBox="0 0 20 20" aria-hidden className="size-5">
            <path
              d="M5.5 5.5l9 9m0-9l-9 9"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>

        <div className="pe-8">
          <h2 className="font-display text-lg font-bold text-ink">{dict.board.nameTitle}</h2>
          <p className="text-sm text-pretty text-ink-soft">
            {/* Names the exact fallback the player is looking at right now,
                rather than a generic "a random code" — the same one shown in
                the header and on the leaderboard. */}
            {look.handle ? fmt(dict.board.nameHint, { handle: look.handle }) : dict.board.nameHintLoading}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Avatar id={look.avatar} className="size-12" />
          <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row">
            <input
              value={name}
              maxLength={MAX_LENGTH}
              placeholder={dict.board.namePlaceholder}
              onChange={(event) => {
                setTyped(event.target.value);
                setSaved(false);
              }}
              className="min-w-0 flex-1 rounded-2xl border border-line bg-surface-2 px-4 py-2.5 text-ink outline-none placeholder:text-ink-soft focus-visible:border-primary"
            />
            <Button variant="soft" size="md" disabled={busy} onClick={saveName}>
              {saved ? dict.board.nameSaved : dict.board.nameSave}
            </Button>
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm text-ink-soft">{dict.board.avatarTitle}</p>
          <div className="grid grid-cols-6 gap-2">
            {AVATARS.map((one) => (
              <button
                key={one.id}
                type="button"
                disabled={busy}
                aria-pressed={look.avatar === one.id}
                onClick={() => pick(one.id)}
                className={`rounded-full transition-transform hover:scale-105 disabled:opacity-60 ${
                  look.avatar === one.id ? "ring-2 ring-primary ring-offset-2 ring-offset-surface" : ""
                }`}
              >
                <Avatar id={one.id} className="size-full" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
