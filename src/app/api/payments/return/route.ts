import { NextResponse, type NextRequest } from "next/server";

import { getPaymentProvider } from "@/lib/payments/provider";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * Where the buyer lands after paying.
 *
 * With a real provider this only sends them back into the site — the points are
 * credited by the webhook, because a browser returning from a payment page
 * proves nothing about whether the payment succeeded.
 *
 * The test provider has no webhook, so it credits here instead. That is only
 * safe because the test provider is off unless PAYMENTS_PROVIDER=mock, which is
 * never set in production.
 */
export async function GET(request: NextRequest) {
  const provider = getPaymentProvider();
  const ref = request.nextUrl.searchParams.get("mock_ref");

  let outcome = "cancelled";

  if (provider?.id === "mock" && ref) {
    const admin = getSupabaseAdminClient();
    if (admin) {
      const { data, error } = await admin.rpc("fulfil_order", { p_provider_ref: ref });
      const result = (Array.isArray(data) ? data[0] : data) as { ok: boolean } | null;
      outcome = !error && result?.ok ? "ok" : "failed";
    }
  } else if (ref) {
    outcome = "pending";
  }

  // The proxy sends "/" on to the right language.
  return NextResponse.redirect(new URL(`/?topup=${outcome}`, request.nextUrl.origin));
}
