import "server-only";

const SITEVERIFY = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/** True when a Turnstile secret is configured — i.e. the /report form should
 *  enforce the bot check. When false, verification is skipped entirely so the
 *  form works without Turnstile set up. */
export function turnstileEnforced(): boolean {
  return Boolean(process.env.TURNSTILE_SECRET_KEY);
}

/**
 * Verify a Turnstile token with Cloudflare's siteverify API. Returns true (pass)
 * when no secret is configured — verification is opt-in. When enforcement IS on,
 * fails CLOSED: a missing/invalid token or any siteverify error is a fail, so
 * spam can't slip through on a transient hiccup. Never throws.
 */
export async function verifyTurnstile(token: string, remoteip?: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true; // not enforced — nothing to check
  if (!token) return false;
  try {
    const body = new URLSearchParams({ secret, response: token });
    if (remoteip) body.set("remoteip", remoteip);
    const res = await fetch(SITEVERIFY, { method: "POST", body });
    if (!res.ok) return false;
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch (err) {
    console.error("[report] Turnstile verify failed:", err);
    return false;
  }
}
