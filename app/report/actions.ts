"use server";

import { parseReport, type ReportFieldErrors } from "@/lib/report/schema";
import { sendReportEmail } from "@/lib/email/ses";
import { turnstileEnforced, verifyTurnstile } from "@/lib/report/turnstile";

export type ReportState =
  | { status: "idle" }
  /** Validation failed — per-field messages, plus the values to refill the form. */
  | { status: "invalid"; errors: ReportFieldErrors; values: Record<string, string> }
  /** Turnstile bot check failed (only when Turnstile is configured). */
  | { status: "captcha" }
  /** Emailed successfully. */
  | { status: "sent" }
  /** SES isn't configured on this deploy — show the mailto fallback. */
  | { status: "unconfigured" }
  /** SES accepted nothing (network/permission error) — show the mailto fallback. */
  | { status: "error" };

const FIELDS = ["name", "email", "era", "set", "issue", "message"] as const;

/** Server Action backing the inaccuracy report form. Validates, then emails the
 *  report via SES. Returns a state `useActionState` renders into feedback. */
export async function submitReport(
  _prev: ReportState,
  formData: FormData,
): Promise<ReportState> {
  const raw: Record<string, string> = {};
  for (const f of FIELDS) raw[f] = String(formData.get(f) ?? "");

  const parsed = parseReport(raw);
  if (!parsed.ok) {
    return { status: "invalid", errors: parsed.errors, values: raw };
  }

  // Bot check — only enforced when a Turnstile secret is configured.
  if (turnstileEnforced()) {
    const token = String(formData.get("cf-turnstile-response") ?? "");
    if (!(await verifyTurnstile(token))) return { status: "captcha" };
  }

  const result = await sendReportEmail(parsed.data);
  if (result.sent) return { status: "sent" };
  return { status: result.reason === "not-configured" ? "unconfigured" : "error" };
}
