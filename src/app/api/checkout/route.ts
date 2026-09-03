import { randomUUID } from "node:crypto";

import { NextResponse, type NextRequest } from "next/server";

import { getPaymentProvider } from "@/lib/payments/provider";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Starts a purchase.
 *
 * The browser sends which pack it wants and nothing else. The price and the
 * number of points come from the database, so a tampered request buys the same
 * pack at the same price as an honest one.
 */
export async function POST(request: NextRequest) {
  const provider = getPaymentProvider();
  if (!provider) {
    return NextResponse.json({ error: "not-configured" }, { status: 503 });
  }

  const supabase = await getSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "not-configured" }, { status: 503 });

  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return NextResponse.json({ error: "not-authenticated" }, { status: 401 });

  let packId: string;
  let locale = "uk";
  try {
    const body = (await request.json()) as { packId?: unknown; locale?: unknown };
    if (typeof body.packId !== "string") throw new Error("bad body");
    packId = body.packId;
    // Only ever a language we serve — this ends up in a redirect.
    if (body.locale === "uk" || body.locale === "en") locale = body.locale;
  } catch {
    return NextResponse.json({ error: "bad-request" }, { status: 400 });
  }

  const { data: pack } = await supabase
    .from("point_packs")
    .select("id, points, price_cents, currency")
    .eq("id", packId)
    .eq("is_active", true)
    .single();

  if (!pack) return NextResponse.json({ error: "unknown-pack" }, { status: 404 });

  // Orders are written with the trusted key: a player must not be able to
  // invent one, or to name their own price on it.
  const admin = getSupabaseAdminClient();
  if (!admin) return NextResponse.json({ error: "not-configured" }, { status: 503 });

  const orderRef = randomUUID();
  const { error } = await admin.from("orders").insert({
    user_id: user.id,
    pack_id: pack.id,
    amount_cents: pack.price_cents,
    currency: pack.currency,
    provider: provider.id,
    provider_ref: orderRef,
    status: "pending",
  });

  if (error) return NextResponse.json({ error: "order-failed" }, { status: 500 });

  const origin = request.nextUrl.origin;
  const checkout = await provider.createCheckout({
    orderRef,
    packId: pack.id,
    points: pack.points,
    amountMinorUnits: pack.price_cents,
    currency: pack.currency ?? "UAH",
    email: user.email ?? null,
    locale,
    returnUrl: `${origin}/api/payments/return?lang=${locale}`,
    webhookUrl: `${origin}/api/payments/webhook`,
  });

  if (!checkout.ok) return NextResponse.json({ error: checkout.reason }, { status: 502 });

  return NextResponse.json(
    checkout.kind === "form"
      ? { kind: "form", url: checkout.url, fields: checkout.fields }
      : { kind: "redirect", url: checkout.url },
  );
}
