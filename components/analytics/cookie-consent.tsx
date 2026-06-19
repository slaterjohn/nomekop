"use client";

import { usePathname } from "next/navigation";
import { useDict } from "@/components/i18n/language-provider";
import { GbButton } from "@/components/gb/gb-button";
import { useConsentStatus, grantConsent, denyConsent } from "@/lib/analytics/consent";

/**
 * Cookie-consent banner. Sits at the very top of the page, above the header, and
 * is the first focusable thing on the page — its buttons tab in the order the
 * spec asks for: Allow, then Deny, then Close (close counts as a deny). Allow and
 * Deny sit on the left; Close is pushed to the right.
 *
 * Rendered only while consent is "pending"; once the user decides (here or via the
 * Settings → Privacy cookie toggle) PostHog persists it and the banner stays gone.
 */
export function CookieConsent() {
  const pathname = usePathname() ?? "/";
  const dict = useDict();
  const status = useConsentStatus();

  // Never render on /print/* (Puppeteer renders those to PDF) and `print:hidden`
  // is a second guard for an actual browser print — so the banner never lands in
  // exports. Mirrors the splash screen.
  if (status !== "pending" || pathname.startsWith("/print")) return null;

  return (
    <div
      role="region"
      aria-label={dict.consent.label}
      className="relative z-50 flex flex-col gap-3 border-b-4 border-gb-ink bg-gb-accent px-4 py-3 text-gb-ink print:hidden"
    >
      <p className="font-body text-base leading-snug">{dict.consent.message}</p>
      <div className="flex w-full flex-wrap items-center gap-2">
        {/* DOM order = tab order: Allow (1), Deny (2), Close (3). */}
        <GbButton variant="a" onClick={grantConsent}>
          {dict.consent.allow}
        </GbButton>
        <GbButton variant="b" onClick={denyConsent}>
          {dict.consent.deny}
        </GbButton>
        {/* Close = deny; full-text button (proper touch target) pushed to the right. */}
        <GbButton variant="b" className="ml-auto" onClick={denyConsent}>
          {dict.consent.close}
        </GbButton>
      </div>
    </div>
  );
}
