"use client";

import { useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};

/**
 * True on iPhone, iPad and Mac. Used only to put "Sign in with Apple" first —
 * both buttons are always shown, so a wrong guess costs nothing.
 * iPadOS reports itself as a Mac, which is fine here.
 */
function detectApple() {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod|macintosh|mac os x/i.test(navigator.userAgent);
}

export function useIsApplePlatform() {
  return useSyncExternalStore(noopSubscribe, detectApple, () => false);
}
