import "server-only";

/**
 * Reads a provider callback body.
 *
 * WayForPay sends JSON, but not always with a JSON content type: it can arrive
 * form-encoded, and then the whole JSON document is the first key with an empty
 * value. Ordinary form fields are read too, so a provider that posts plain
 * fields also works.
 */
export function parseCallbackBody(body: string): Record<string, unknown> | null {
  if (!body) return null;

  try {
    const parsed: unknown = JSON.parse(body);
    if (parsed && typeof parsed === "object") return parsed as Record<string, unknown>;
  } catch {
    // Not JSON on its own — try the form-encoded shapes below.
  }

  let params: URLSearchParams;
  try {
    params = new URLSearchParams(body);
  } catch {
    return null;
  }

  const first = params.keys().next();
  if (first.done) return null;

  // The whole document smuggled in as a key.
  if (params.get(first.value) === "") {
    try {
      const parsed: unknown = JSON.parse(first.value);
      if (parsed && typeof parsed === "object") return parsed as Record<string, unknown>;
    } catch {
      // Fall through: it really is a plain field.
    }
  }

  return Object.fromEntries(params.entries());
}
