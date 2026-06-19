"use client";

import { useDict } from "@/components/i18n/language-provider";
import { GbButton } from "@/components/gb/gb-button";
import { useConsentStatus, grantConsent, denyConsent } from "@/lib/analytics/consent";

/**
 * Cookie-consent banner. Sits at the very top of the page, above the header, and
 * is the first focusable thing on the page — its buttons tab in the order the
 * spec asks for: Allow, then Deny, then Close (the X, which counts as a deny).
 *
 * Rendered only while consent is "pending"; once the user decides, PostHog
 * persists it and the banner stays gone. Analytics-only, so the copy is kept
 * simple. It lives inside the language + PostHog providers, so it's translated
 * and can read/update consent.
 */
export function CookieConsent() {
  const dict = useDict();
  const status = useConsentStatus();

  if (status !== "pending") return null;

  return (
    <div
      role="region"
      aria-label={dict.consent.label}
      className="relative z-50 flex flex-col items-center gap-3 border-b-4 border-gb-ink bg-gb-accent px-4 py-3 text-gb-ink sm:flex-row sm:justify-center sm:gap-4"
    >
      <p className="max-w-2xl text-center font-body text-base leading-snug sm:text-left">
        {dict.consent.message}
      </p>
      <div className="flex shrink-0 items-center gap-2">
        {/* DOM order = tab order: Allow (1), Deny (2), Close (3). */}
        <GbButton variant="a" size="sm" onClick={grantConsent}>
          {dict.consent.allow}
        </GbButton>
        <GbButton variant="b" size="sm" onClick={denyConsent}>
          {dict.consent.deny}
        </GbButton>
        <GbButton
          variant="plain"
          size="sm"
          aria-label={dict.consent.close}
          onClick={denyConsent}
          className="px-2 text-base"
        >
          {/* Close = deny */}
          <span aria-hidden="true">✕</span>
        </GbButton>
      </div>
    </div>
  );
}
