"use client";

import { GbToggle } from "@/components/gb/gb-toggle";
import { useDict } from "@/components/i18n/language-provider";
import { analyticsEnabled } from "@/lib/analytics/posthog";
import { useConsentStatus, grantConsent, denyConsent } from "@/lib/analytics/consent";

/**
 * Settings → Privacy control for analytics cookies. Reads the SAME consent state
 * as the banner, so it's pre-set to whatever the user chose there (ON = allowed),
 * and flipping it grants/denies consent (which also dismisses the banner if it's
 * still up). Renders nothing when analytics is disabled (no key).
 */
export function CookieToggle() {
  const dict = useDict();
  const status = useConsentStatus();

  if (!analyticsEnabled()) return null;

  return (
    <GbToggle
      label={dict.settings.cookies}
      checked={status === "granted"}
      onChange={(on) => (on ? grantConsent("settings") : denyConsent())}
    />
  );
}
