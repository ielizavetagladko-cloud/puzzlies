"use client";

export type Checkout =
  | { kind: "redirect"; url: string }
  | { kind: "form"; url: string; fields: Record<string, string | string[]> };

/**
 * Leaves the site for the provider's payment page.
 *
 * Some providers take the buyer by URL. WayForPay takes a signed form, which
 * has to be built and submitted — there is no address that carries it.
 */
export function goToCheckout(checkout: Checkout) {
  if (checkout.kind === "redirect") {
    window.location.href = checkout.url;
    return;
  }

  const form = document.createElement("form");
  form.method = "POST";
  form.action = checkout.url;
  form.acceptCharset = "utf-8";

  for (const [name, value] of Object.entries(checkout.fields)) {
    for (const one of Array.isArray(value) ? value : [value]) {
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = name;
      input.value = one;
      form.append(input);
    }
  }

  document.body.append(form);
  form.submit();
}

export type StartResult = "left" | "not-authenticated" | "not-configured" | "already-paid" | "failed";

/**
 * Starts a payment and hands the buyer over to the provider.
 *
 * `replaces` names an earlier unfinished order. The provider will not take the
 * same order reference twice, so continuing an abandoned payment means starting
 * a fresh one and closing the old — done on the server, where ownership of that
 * order can actually be checked.
 */
export async function startCheckout(
  packId: string,
  locale: string,
  replaces?: string,
): Promise<StartResult> {
  try {
    const response = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ packId, locale, replaces }),
    });

    if (response.status === 401) return "not-authenticated";
    if (response.status === 503) return "not-configured";
    if (response.status === 409) return "already-paid";
    if (!response.ok) return "failed";

    goToCheckout((await response.json()) as Checkout);
    return "left";
  } catch {
    return "failed";
  }
}
