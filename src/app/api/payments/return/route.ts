import { NextResponse, type NextRequest } from "next/server";

import { parseCallbackBody } from "@/lib/payments/callback";
import { getPaymentProvider } from "@/lib/payments/provider";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * Where the buyer lands after paying.
 *
 * This route never decides whether a payment succeeded — the webhook does, and
 * a browser coming back from a payment page proves nothing. All it does is read
 * the order the webhook has already settled and tell the buyer what it says.
 *
 * The test provider has no webhook, so it credits here instead. That is only
 * safe because it is off unless PAYMENTS_PROVIDER=mock, which is never set in
 * production.
 */

type Outcome = { outcome: string; points: number };

async function readOrder(orderRef: string): Promise<Outcome> {
  const admin = getSupabaseAdminClient();
  if (!admin) return { outcome: "pending", points: 0 };

  const { data } = await admin
    .from("orders")
    .select("status, points_granted")
    .eq("provider_ref", orderRef)
    .single();

  if (!data) return { outcome: "failed", points: 0 };
  if (data.status === "paid") {
    return { outcome: "ok", points: (data.points_granted as number) ?? 0 };
  }
  // The webhook may simply not have arrived yet; either way there is nothing
  // to celebrate on this page.
  return { outcome: data.status === "pending" ? "pending" : "failed", points: 0 };
}

function back(request: NextRequest, { outcome, points }: Outcome) {
  const lang = request.nextUrl.searchParams.get("lang") === "en" ? "en" : "uk";
  const url = new URL(`/${lang}/points`, request.nextUrl.origin);
  url.searchParams.set("topup", outcome);
  // The exact number makes the confirmation mean something.
  if (points > 0) url.searchParams.set("points", String(points));
  // 303, so the browser follows a cross-site POST with a GET.
  return NextResponse.redirect(url, 303);
}

export async function GET(request: NextRequest) {
  const provider = getPaymentProvider();
  const mockRef = request.nextUrl.searchParams.get("mock_ref");

  if (provider?.id === "mock" && mockRef) {
    const admin = getSupabaseAdminClient();
    if (admin) {
      const { data, error } = await admin.rpc("fulfil_order", { p_provider_ref: mockRef });
      const result = (Array.isArray(data) ? data[0] : data) as
        | { ok: boolean; points_granted: number }
        | null;
      return back(request, {
        outcome: !error && result?.ok ? "ok" : "failed",
        points: result?.points_granted ?? 0,
      });
    }
  }

  const ref = request.nextUrl.searchParams.get("orderReference") ?? mockRef;
  if (ref) return back(request, await readOrder(ref));

  return back(request, { outcome: "cancelled", points: 0 });
}

/** WayForPay sends the buyer back with a POST, not a plain link. */
export async function POST(request: NextRequest) {
  const data = parseCallbackBody(await request.text());
  const ref = data?.orderReference ? String(data.orderReference) : null;

  if (!ref) return back(request, { outcome: "cancelled", points: 0 });
  return back(request, await readOrder(ref));
}
