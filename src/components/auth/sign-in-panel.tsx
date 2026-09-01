"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { fmt } from "@/i18n/config";
import { useI18n } from "@/i18n/provider";
import { isValidEmail, useAuth } from "@/lib/auth";
import { useIsApplePlatform } from "@/lib/platform";

function GoogleMark({ className = "size-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        fill="#4285F4"
        d="M23.5 12.27c0-.79-.07-1.54-.2-2.27H12v4.51h6.47a5.54 5.54 0 0 1-2.4 3.63v3h3.87c2.27-2.09 3.56-5.17 3.56-8.87Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.08 7.94-2.91l-3.87-3c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.28v3.09A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.28a7.2 7.2 0 0 1 0-4.56V6.63H1.28a12 12 0 0 0 0 10.74l3.99-3.09Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.43-3.43C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.28 6.63l3.99 3.09C6.22 6.86 8.87 4.75 12 4.75Z"
      />
    </svg>
  );
}

function AppleMark({ className = "size-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M16.37 1.43c0 1.14-.44 2.2-1.16 3.02-.87.99-2.3 1.76-3.47 1.67a3.6 3.6 0 0 1-.03-.42c0-1.12.5-2.29 1.24-3.06.83-.87 2.24-1.53 3.4-1.58.01.13.02.26.02.37Z" />
      <path d="M20.9 8.6c-.13.08-2.24 1.29-2.21 3.86.03 3.06 2.68 4.08 2.71 4.09-.02.07-.42 1.45-1.4 2.87-.84 1.23-1.72 2.46-3.11 2.49-1.36.03-1.8-.81-3.36-.81s-2.05.78-3.34.84c-1.34.05-2.36-1.33-3.21-2.55C5.26 16.9 3.94 12.3 5.74 9.2c.89-1.54 2.49-2.51 4.22-2.54 1.31-.03 2.55.88 3.35.88s2.3-1.09 3.88-.93c.66.03 2.51.27 3.71 1.99Z" />
    </svg>
  );
}

export function SignInPanel({ onSignedIn }: { onSignedIn?: () => void }) {
  const { dict } = useI18n();
  const {
    pending,
    mode,
    requestEmailLink,
    completeEmailLink,
    cancelEmailLink,
    signInWithGoogle,
    signInWithApple,
  } = useAuth();
  const isApple = useIsApplePlatform();

  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!isValidEmail(email)) {
      setError(dict.auth.invalidEmail);
      return;
    }
    setBusy(true);
    const result = await requestEmailLink(email);
    setBusy(false);
    if (!result.ok) setError(dict.auth.sendFailed);
  }

  async function openLink() {
    setBusy(true);
    const result = await completeEmailLink();
    setBusy(false);
    if (result.ok) onSignedIn?.();
  }

  async function startProvider(start: () => Promise<{ ok: boolean; reason?: string }>) {
    setBusy(true);
    setError(null);
    const result = await start();
    setBusy(false);
    if (!result.ok) {
      setError(dict.auth.providerUnavailable);
      return;
    }
    // Supabase navigates away to the provider; only the demo path returns here
    // already signed in.
    if (mode === "demo") onSignedIn?.();
  }

  const google = () => startProvider(signInWithGoogle);
  const apple = () => startProvider(signInWithApple);

  const appleButton = (
    <Button key="apple" variant="apple" size="lg" className="w-full" disabled={busy} onClick={apple}>
      <AppleMark />
      {dict.auth.apple}
    </Button>
  );

  const googleButton = (
    <Button key="google" variant="soft" size="lg" className="w-full" disabled={busy} onClick={google}>
      <GoogleMark />
      {dict.auth.google}
    </Button>
  );

  if (pending) {
    return (
      <div className="space-y-4">
        <div className="rounded-3xl bg-surface-2 p-4 text-center">
          <p className="text-3xl">📬</p>
          <p className="mt-2 font-display font-bold text-ink">
            {fmt(dict.auth.sentTitle, { email: pending.email })}
          </p>
          <p className="mt-1 text-sm text-pretty text-ink-soft">{dict.auth.sentHint}</p>
          {mode === "supabase" && (
            <p className="mt-2 text-xs text-pretty text-ink-soft">{dict.auth.checkSpam}</p>
          )}
        </div>

        {mode === "demo" && (
          <Button variant="primary" size="lg" className="w-full" disabled={busy} onClick={openLink}>
            ✉️ {dict.auth.demoOpen}
          </Button>
        )}

        <button
          type="button"
          onClick={cancelEmailLink}
          className="w-full font-display text-sm font-semibold text-ink-soft transition-colors hover:text-ink"
        >
          {dict.auth.changeEmail}
        </button>

        {mode === "demo" && (
          <p className="text-center text-xs text-pretty text-ink-soft">⚠️ {dict.auth.demoNotice}</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <form onSubmit={submit} className="space-y-2">
        <label htmlFor="signin-email" className="block font-display text-sm font-bold text-ink-soft">
          {dict.auth.emailLabel}
        </label>
        <input
          id="signin-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder={dict.auth.emailPlaceholder}
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            setError(null);
          }}
          className={`h-12 w-full rounded-full border bg-surface px-5 text-base text-ink outline-none transition-colors placeholder:text-ink-soft/70 focus:border-primary ${
            error ? "border-blush" : "border-line"
          }`}
        />

        <Button type="submit" variant="primary" size="lg" className="w-full" disabled={busy}>
          {dict.auth.sendLink}
        </Button>
      </form>

      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-line" />
        <span className="font-display text-xs font-bold text-ink-soft uppercase">
          {dict.auth.or}
        </span>
        <span className="h-px flex-1 bg-line" />
      </div>

      {/* Apple first on Apple devices, where it opens the system sheet.
          The gap allows for the 5px ledge under each button, which does not
          take up layout space. */}
      <div className="space-y-4">
        {isApple ? [appleButton, googleButton] : [googleButton, appleButton]}
      </div>

      {error && <p className="text-center text-sm text-pretty text-blush-ink">{error}</p>}

      {mode === "demo" && (
        <p className="text-center text-xs text-pretty text-ink-soft">⚠️ {dict.auth.demoNotice}</p>
      )}
    </div>
  );
}
