"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { SignInPanel } from "@/components/auth/sign-in-panel";
import { PuzzleMark } from "@/components/site/logo";
import { useI18n } from "@/i18n/provider";
import { useAuth } from "@/lib/auth";

export function SignInScreen() {
  const { dict, locale } = useI18n();
  const { user, ready } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (ready && user) router.replace(`/${locale}/profile`);
  }, [locale, ready, router, user]);

  const reasons = [dict.auth.why1, dict.auth.why2, dict.auth.why3];

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="grid gap-5 md:grid-cols-[1fr_1.1fr] md:items-start">
        <section className="card-soft space-y-5 p-5 sm:p-7">
          <div className="flex items-center gap-3">
            <PuzzleMark className="size-10" />
            <div>
              <h1 className="font-display text-xl font-bold text-ink sm:text-2xl">
                {dict.auth.title}
              </h1>
              <p className="text-sm text-pretty text-ink-soft">{dict.auth.subtitle}</p>
            </div>
          </div>

          <SignInPanel onSignedIn={() => router.replace(`/${locale}/profile`)} />
        </section>

        <section className="card-soft space-y-4 p-5 sm:p-7">
          <h2 className="font-display text-lg font-bold text-ink">{dict.auth.whyTitle}</h2>
          <ul className="space-y-3">
            {reasons.map((reason, index) => (
              <li key={reason} className="flex items-start gap-3">
                <span
                  className={`mt-0.5 grid size-8 shrink-0 place-items-center rounded-2xl text-base ${
                    ["bg-mint", "bg-sky", "bg-lilac"][index]
                  }`}
                >
                  {["🔒", "☁️", "✨"][index]}
                </span>
                <span className="text-sm text-pretty text-ink">{reason}</span>
              </li>
            ))}
          </ul>

          <Link
            href={`/${locale}`}
            className="inline-block font-display text-sm font-semibold text-ink-soft transition-colors hover:text-ink"
          >
            ← {dict.auth.playAsGuest}
          </Link>
        </section>
      </div>
    </div>
  );
}
