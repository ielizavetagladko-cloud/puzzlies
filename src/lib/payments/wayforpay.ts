import "server-only";

import { createHmac } from "node:crypto";

import { parseCallbackBody } from "./callback";
import type { CheckoutRequest, CheckoutResult, PaymentProvider, WebhookResult } from "./provider";

/**
 * WayForPay.
 *
 * A Ukrainian acquirer, so there is no redirect URL to send the buyer to: the
 * payment page is reached by POSTing a signed form to it. Everything below
 * exists to build that form and to answer the callback it sends back.
 *
 * Every signature is an HMAC-MD5 of named fields joined by semicolons, keyed by
 * the merchant secret. MD5 is their choice, not ours; it is a shared-secret
 * signature rather than a password hash, and the field list is fixed by them.
 */

const PURCHASE_URL = "https://secure.wayforpay.com/pay";

/** Anything else means the money did not arrive, or no longer has. */
const PAID = "Approved";

function sign(parts: (string | number)[], secret: string): string {
  return createHmac("md5", secret).update(parts.join(";"), "utf8").digest("hex");
}

/**
 * Minor units to the decimal string WayForPay signs and charges.
 *
 * Whole amounts are written without kopiyky, matching their own example, which
 * carries productPrice 1000 next to 547.36. The signature covers this exact
 * text, so how it is written matters.
 */
function toAmount(minorUnits: number): string {
  const value = minorUnits / 100;
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

type Config = { account: string; secret: string; domain: string };

function readConfig(): Config | null {
  const account = process.env.WAYFORPAY_MERCHANT_ACCOUNT;
  const secret = process.env.WAYFORPAY_MERCHANT_SECRET;
  const domain = process.env.WAYFORPAY_MERCHANT_DOMAIN;
  if (!account || !secret || !domain) return null;
  return { account, secret, domain };
}

/**
 * The amount exactly as it was written on the wire.
 *
 * The signature covers the literal text WayForPay sent, and JSON parsing loses
 * it: "amount":89.00 becomes the number 89, which stringifies back as "89" and
 * would fail the check. So the digits are lifted out of the raw body.
 */
function rawNumber(body: string, field: string, parsed: unknown): string {
  const match = new RegExp(`"${field}"\\s*:\\s*(-?\\d+(?:\\.\\d+)?)`).exec(body);
  return match ? match[1] : str(parsed);
}

function str(value: unknown): string {
  return value === undefined || value === null ? "" : String(value);
}

export function createWayForPayProvider(): PaymentProvider | null {
  const config = readConfig();
  if (!config) return null;

  return {
    id: "wayforpay",

    async createCheckout(request: CheckoutRequest): Promise<CheckoutResult> {
      const { orderRef, points, amountMinorUnits, currency, email, returnUrl, webhookUrl, locale } =
        request;

      const amount = toAmount(amountMinorUnits);
      const orderDate = Math.floor(Date.now() / 1000);
      const productName = locale === "uk" ? `Пазлики — ${points} балів` : `Puzzlies — ${points} points`;

      // Order fixed by WayForPay: the three product arrays come as all names,
      // then all counts, then all prices — not grouped per product. This
      // reproduces their documented base line exactly.
      //
      // Their published example hash cannot be reproduced from their published
      // example string and key — two independent HMAC-MD5 implementations agree
      // with each other and disagree with the docs, and no other construction
      // (plain md5, key and message swapped, concatenation) yields it either.
      // The example is stale; the field order it demonstrates is not, and is
      // stated in prose in three places.
      const signature = sign(
        [
          config.account,
          config.domain,
          orderRef,
          orderDate,
          amount,
          currency,
          productName,
          "1",
          amount,
        ],
        config.secret,
      );

      return {
        ok: true,
        kind: "form",
        url: PURCHASE_URL,
        fields: {
          merchantAccount: config.account,
          merchantDomainName: config.domain,
          merchantTransactionSecureType: "AUTO",
          merchantSignature: signature,
          orderReference: orderRef,
          orderDate: String(orderDate),
          amount,
          currency,
          "productName[]": [productName],
          "productCount[]": ["1"],
          "productPrice[]": [amount],
          clientEmail: email ?? "",
          language: locale === "uk" ? "UA" : "EN",
          returnUrl,
          serviceUrl: webhookUrl,
        },
      };
    },

    async readWebhook(body: string): Promise<WebhookResult> {
      const data = parseCallbackBody(body);
      if (!data) return { ok: false, reason: "ignored" };

      const orderRef = str(data.orderReference);
      if (!orderRef) return { ok: false, reason: "ignored" };

      const expected = sign(
        [
          str(data.merchantAccount),
          orderRef,
          rawNumber(body, "amount", data.amount),
          str(data.currency),
          str(data.authCode),
          str(data.cardPan),
          str(data.transactionStatus),
          str(data.reasonCode),
        ],
        config.secret,
      );

      if (str(data.merchantSignature) !== expected) {
        return { ok: false, reason: "invalid-signature" };
      }

      // Acknowledging stops the retries. It is sent for every genuine callback,
      // including the ones that report a payment did not go through — those are
      // news we have received, not news we act on.
      const time = Math.floor(Date.now() / 1000);
      const reply = JSON.stringify({
        orderReference: orderRef,
        status: "accept",
        time,
        signature: sign([orderRef, "accept", time], config.secret),
      });

      if (str(data.transactionStatus) !== PAID) {
        return { ok: false, reason: "ignored", reply };
      }

      return { ok: true, orderRef, reply };
    },
  };
}
