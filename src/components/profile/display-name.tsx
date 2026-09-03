"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/provider";
import { useAuth } from "@/lib/auth";
import { saveDisplayName, useStoredDisplayName } from "@/lib/leaderboard";

/** Longer than this and the leaderboard row becomes a name and nothing else. */
const MAX_LENGTH = 24;

/**
 * The name shown on the leaderboard.
 *
 * Nobody is identifiable there until they fill this in: without it a player is
 * a scrap of hash. So it is offered, never assumed, and the email — which the
 * account actually has — is never a candidate.
 */
export function DisplayName() {
  const { dict } = useI18n();
  const { user } = useAuth();

  const stored = useStoredDisplayName();
  const [typed, setTyped] = useState<string | null>(null);
  const name = typed ?? stored ?? "";
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  if (!user) return null;

  async function save() {
    setBusy(true);
    const ok = await saveDisplayName(name);
    setBusy(false);
    setSaved(ok);
  }

  return (
    <section className="card-soft space-y-3 p-4 sm:p-5">
      <div>
        <h2 className="font-display text-base font-bold text-ink">{dict.board.nameTitle}</h2>
        <p className="text-sm text-pretty text-ink-soft">{dict.board.nameHint}</p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
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
        <Button variant="soft" size="md" disabled={busy} onClick={save}>
          {saved ? dict.board.nameSaved : dict.board.nameSave}
        </Button>
      </div>
    </section>
  );
}
