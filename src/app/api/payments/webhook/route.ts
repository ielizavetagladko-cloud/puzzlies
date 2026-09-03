import { NextResponse, type NextRequest } from "next/server";

import { getPaymentProvider } from "@/lib/payments/provider";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * Where the payment provider tells us an order was paid.
 *
 * This is the only path that adds points for money, and it never trusts the
 * caller: the provider's signature is checked first, and the crediting itself
 * happens inside fulfil_order, which no browser session may run.
 *
 * Providers retry on any hiccup, so the same call arriving twice must credit
 * once — that is the database function's job, not this route's.
 */
export async function POST(request: NextRequest) {
  const provider = getPaymentProvider();
  if (!provider) return NextResponse.json({ error: "not-configured" }, { status: 503 });

  const body = await request.text();
  const result = await provider.readWebhook(body, request.headers);

  if (!result.ok) {
    // An invalid signature is someone poking at the endpoint; an ignored event
    // is normal traffic we have no interest in.
    if (result.reason === "invalid-signature") {
      return NextResponse.json({ received: true }, { status: 401 });
    }
    return acknowledge(result.reply);
  }

  const admin = getSupabaseAdminClient();
  if (!admin) return NextResponse.json({ error: "not-configured" }, { status: 503 });

  const { data, error } = await admin.rpc("fulfil_order", { p_provider_ref: result.orderRef });
  const outcome = (Array.isArray(data) ? data[0] : data) as
    | { ok: boolean; reason: string | null }
    | null;

  // A failure here must be visible to the provider so it retries, rather than
  // silently swallowing a payment the player has already made.
  if (error || !outcome?.ok) {
    return NextResponse.json({ error: outcome?.reason ?? "failed" }, { status: 500 });
  }

  return acknowledge(result.reply);
}

/**
 * Some providers require a specific reply and keep retrying until they get it;
 * for the rest a plain 200 is enough.
 */
function acknowledge(reply: string | undefined) {
  if (!reply) return NextResponse.json({ received: true });
  return new NextResponse(reply, {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
