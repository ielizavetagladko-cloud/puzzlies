"use client";

import { useState } from "react";

import { Avatar, AVATARS } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/provider";
import { useAuth } from "@/lib/auth";
import { saveLook, useLook } from "@/lib/leaderboard";

/** Longer than this and the leaderboard row becomes a name and nothing else. */
const MAX_LENGTH = 24;

/**
 * How the player appears on the leaderboard.
 *
 * Nobody is identifiable there until they fill this in: without a name a player
 * is a scrap of hash. So it is offered, never assumed, and the email — which the
 * account actually has — is never a candidate.
 */
export function DisplayName() {
  const { dict } = useI18n();
  const { user } = useAuth();

  const look = useLook();
  const [typed, setTyped] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  const name = typed ?? look.name ?? "";

  if (!user) return null;

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
    <section className="card-soft space-y-4 p-4 sm:p-5">
      <div>
        <h2 className="font-display text-base font-bold text-ink">{dict.board.nameTitle}</h2>
        <p className="text-sm text-pretty text-ink-soft">{dict.board.nameHint}</p>
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
        <div className="grid grid-cols-6 gap-2 sm:grid-cols-8">
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
    </section>
  );
}
