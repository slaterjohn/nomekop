"use client";

import { useActionState, useId, useMemo, useState } from "react";
import Script from "next/script";
import { GbButton } from "@/components/gb/gb-button";
import { GbDialogBox } from "@/components/gb/gb-dialog-box";
import { submitReport, type ReportState } from "@/app/report/actions";
import { ISSUE_TYPES } from "@/lib/report/schema";

export type ReportSetRef = { id: string; name: string; series: string };

type Props = {
  /** All eras (series), newest-first — populates the era dropdown. */
  eras: string[];
  /** Every set, for the set dropdown (filtered by the chosen era). */
  sets: ReportSetRef[];
  /** Pre-selected era/set when arriving from a disclaimer link. */
  initialEra: string;
  initialSet: string;
  /** Site contact address for the graceful "email us directly" fallback. */
  contactEmail: string;
  /** Cloudflare Turnstile site key. When set, the bot-check widget renders;
   *  when absent (undefined/empty), no widget and no enforcement. */
  turnstileSiteKey?: string;
};

const INPUT =
  "min-h-11 w-full min-w-0 border-[3px] border-gb-ink bg-gb-bg px-3 py-2 font-body text-lg text-gb-ink shadow-[2px_2px_0_0_var(--gb-ink)] outline-none focus-visible:-translate-y-px";
const LABEL = "font-pixel text-[10px] uppercase leading-relaxed";

const INITIAL: ReportState = { status: "idle" };

export function ReportForm({
  eras,
  sets,
  initialEra,
  initialSet,
  contactEmail,
  turnstileSiteKey,
}: Props) {
  const [state, formAction, pending] = useActionState(submitReport, INITIAL);
  const [era, setEra] = useState(initialEra);
  const [set, setSet] = useState(initialSet);
  const ids = useId();
  const fieldId = (f: string) => `${ids}-${f}`;
  const errId = (f: string) => `${ids}-${f}-err`;

  // Sets belonging to the chosen era (empty era → all sets).
  const eraSets = useMemo(
    () => sets.filter((s) => !era || s.series === era),
    [sets, era],
  );

  const errors = state.status === "invalid" ? state.errors : undefined;
  const fieldError = (f: string) => errors?.[f as keyof typeof errors]?.[0];

  if (state.status === "sent") {
    return (
      <GbDialogBox>
        Thanks — your report is on its way. We read every one and fix what we can.
      </GbDialogBox>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state.status === "unconfigured" || state.status === "error" ? (
        <div
          role="alert"
          className="border-[3px] border-double border-gb-ink bg-gb-accent/40 p-3 font-body text-lg"
        >
          We couldn&apos;t send that just now. Please email us directly at{" "}
          <a
            href={`mailto:${contactEmail}?subject=NOMEKOP%20inaccuracy%20report`}
            className="underline underline-offset-2"
          >
            {contactEmail}
          </a>
          .
        </div>
      ) : null}

      <Field id={fieldId("name")} label="Your name" error={fieldError("name")} errId={errId("name")}>
        <input
          id={fieldId("name")}
          name="name"
          type="text"
          required
          maxLength={100}
          autoComplete="name"
          className={INPUT}
          aria-describedby={fieldError("name") ? errId("name") : undefined}
        />
      </Field>

      <Field id={fieldId("email")} label="Your email" error={fieldError("email")} errId={errId("email")}>
        <input
          id={fieldId("email")}
          name="email"
          type="email"
          required
          maxLength={200}
          autoComplete="email"
          className={INPUT}
          aria-describedby={fieldError("email") ? errId("email") : undefined}
        />
      </Field>

      <Field id={fieldId("era")} label="Era" error={fieldError("era")} errId={errId("era")}>
        <select
          id={fieldId("era")}
          name="era"
          required
          value={era}
          onChange={(e) => {
            setEra(e.target.value);
            // Drop a now-mismatched set so we never submit set ∉ era.
            setSet((cur) => (sets.some((s) => s.id === cur && s.series === e.target.value) ? cur : ""));
          }}
          className={INPUT}
          aria-describedby={fieldError("era") ? errId("era") : undefined}
        >
          <option value="">— Choose an era —</option>
          {eras.map((e) => (
            <option key={e} value={e}>
              {e}
            </option>
          ))}
        </select>
      </Field>

      <Field id={fieldId("set")} label="Set (optional)" error={fieldError("set")} errId={errId("set")}>
        <select
          id={fieldId("set")}
          name="set"
          value={set}
          onChange={(e) => setSet(e.target.value)}
          className={INPUT}
          aria-describedby={fieldError("set") ? errId("set") : undefined}
        >
          <option value="">Not set-specific</option>
          {eraSets.map((s) => (
            <option key={s.id} value={s.name}>
              {s.name}
            </option>
          ))}
        </select>
      </Field>

      <Field id={fieldId("issue")} label="Issue" error={fieldError("issue")} errId={errId("issue")}>
        <select
          id={fieldId("issue")}
          name="issue"
          required
          defaultValue=""
          className={INPUT}
          aria-describedby={fieldError("issue") ? errId("issue") : undefined}
        >
          <option value="" disabled>
            — Choose an issue —
          </option>
          {ISSUE_TYPES.map((i) => (
            <option key={i.value} value={i.value}>
              {i.label}
            </option>
          ))}
        </select>
      </Field>

      <Field id={fieldId("message")} label="What's wrong?" error={fieldError("message")} errId={errId("message")}>
        <textarea
          id={fieldId("message")}
          name="message"
          required
          rows={5}
          maxLength={2000}
          className={`${INPUT} min-h-28 resize-y`}
          aria-describedby={fieldError("message") ? errId("message") : undefined}
        />
      </Field>

      {turnstileSiteKey ? (
        <div className="flex flex-col gap-1">
          {/* Cloudflare auto-renders this .cf-turnstile div and injects a hidden
              cf-turnstile-response input into the form, which the Server Action
              reads. Only loaded when a site key is configured. */}
          <Script
            src="https://challenges.cloudflare.com/turnstile/v0/api.js"
            strategy="afterInteractive"
          />
          <div className="cf-turnstile" data-sitekey={turnstileSiteKey} data-theme="auto" />
          {state.status === "captcha" ? (
            <p className="font-pixel text-[10px] uppercase leading-relaxed text-gb-ink">
              ⚠ Please complete the verification and try again.
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="flex items-center gap-3">
        <GbButton type="submit" variant="a" disabled={pending}>
          {pending ? "Sending…" : "Send report"}
        </GbButton>
        <p aria-live="polite" className="sr-only">
          {state.status === "invalid"
            ? "The form has errors."
            : state.status === "captcha"
              ? "Verification failed."
              : pending
                ? "Sending."
                : ""}
        </p>
      </div>
    </form>
  );
}

function Field({
  id,
  label,
  error,
  errId,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  errId: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className={LABEL}>
        {label}
      </label>
      {children}
      {error ? (
        <p id={errId} className="font-pixel text-[10px] uppercase leading-relaxed text-gb-ink">
          ⚠ {error}
        </p>
      ) : null}
    </div>
  );
}
