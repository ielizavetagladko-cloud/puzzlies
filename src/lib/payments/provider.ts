import "server-only";

import { createWayForPayProvider } from "./wayforpay";

/**
 * Where a payment provider plugs in.
 *
 * Nothing above this file knows which provider is used. Whichever it is, it has
 * to do exactly two things: send the buyer somewhere to pay, and tell us
 * afterwards that they did. Everything else — prices, crediting, idempotency —
 * already lives in the database.
 */

export type CheckoutRequest = {
  orderRef: string;
  packId: string;
  points: number;
  /** In the smallest unit of `currency`: kopiyky for UAH, cents for USD. */
  amountMinorUnits: number;
  currency: string;
  email: string | null;
  locale: string;
  /** Where the buyer comes back to when the payment is done. */
  returnUrl: string;
  /** Where the provider reports the outcome, machine to machine. */
  webhookUrl: string;
};

/**
 * Some providers hand over a URL to send the buyer to; others, WayForPay among
 * them, expect a signed form to be POSTed to their payment page. Both are
 * described here so the page can do either without knowing which is which.
 */
export type CheckoutResult =
  | { ok: true; kind: "redirect"; url: string }
  | { ok: true; kind: "form"; url: string; fields: Record<string, string | string[]> }
  | { ok: false; reason: "not-configured" | "failed" };

/**
 * `reply` is the body the provider insists on receiving back. WayForPay keeps
 * retrying a callback until it gets a signed acknowledgement, so it is sent for
 * every genuine callback — including ones reporting a payment that failed.
 */
export type WebhookResult =
  | { ok: true; orderRef: string; reply?: string }
  | { ok: false; reason: "invalid-signature" | "ignored"; reply?: string };

export type PaymentProvider = {
  id: string;
  createCheckout(request: CheckoutRequest): Promise<CheckoutResult>;
  /** Verifies the callback really came from the provider, and names the order. */
  readWebhook(body: string, headers: Headers): Promise<WebhookResult>;
};

/**
 * Test provider. Skips the payment and returns straight to the site, so the
 * whole flow can be walked through locally.
 *
 * Off unless PAYMENTS_PROVIDER=mock is set, and that variable is deliberately
 * not set in production: with it on, anyone could mint points for free.
 */
const mockProvider: PaymentProvider = {
  id: "mock",
  async createCheckout({ orderRef, returnUrl }) {
    const url = new URL(returnUrl);
    url.searchParams.set("mock_ref", orderRef);
    return { ok: true, kind: "redirect", url: url.toString() };
  },
  async readWebhook(body) {
    try {
      const parsed = JSON.parse(body) as { orderRef?: string };
      if (!parsed.orderRef) return { ok: false, reason: "ignored" };
      return { ok: true, orderRef: parsed.orderRef };
    } catch {
      return { ok: false, reason: "ignored" };
    }
  },
};

export function getPaymentProvider(): PaymentProvider | null {
  // The test provider is opt-in and never wins over a real one by accident.
  if (process.env.PAYMENTS_PROVIDER === "mock") return mockProvider;
  return createWayForPayProvider();
}
