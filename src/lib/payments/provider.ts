import "server-only";

/**
 * Where a payment provider plugs in.
 *
 * Nothing above this file knows which provider is used, because the choice is
 * still open: an international audience selling from Ukraine most likely means
 * a merchant of record such as Paddle, which handles VAT worldwide, but Stripe
 * through a foreign company and a Ukrainian acquirer are both live options.
 *
 * Whichever it turns out to be, it has to do exactly two things: send the buyer
 * somewhere to pay, and tell us afterwards that they did. Everything else —
 * prices, crediting, idempotency — already lives in the database.
 */

export type CheckoutRequest = {
  orderRef: string;
  packId: string;
  points: number;
  amountCents: number;
  email: string | null;
  /** Where the buyer comes back to when the payment is done. */
  returnUrl: string;
};

export type CheckoutResult =
  | { ok: true; redirectUrl: string }
  | { ok: false; reason: "not-configured" | "failed" };

export type WebhookResult =
  | { ok: true; orderRef: string }
  | { ok: false; reason: "invalid-signature" | "ignored" };

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
    return { ok: true, redirectUrl: url.toString() };
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
  if (process.env.PAYMENTS_PROVIDER === "mock") return mockProvider;
  // No real provider yet: the account and the paperwork come first.
  return null;
}
