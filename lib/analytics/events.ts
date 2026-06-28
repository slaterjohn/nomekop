// Named, semantic product-analytics events. A thin guarded wrapper over
// posthog.capture: a no-op when analytics is disabled (empty key) and — because
// PostHog is opt-out-by-default — a no-op in PostHog itself until the user grants
// consent, so no per-call consent check is needed here. Never throws; analytics
// is best-effort and must not break the app.
import posthog from "posthog-js";
import { analyticsEnabled } from "@/lib/analytics/posthog";

/** Every custom event the app emits. snake_case, past tense. The canonical list
 *  — a typo is a type error, and it's greppable in one place. */
export type AnalyticsEvent =
  | "binder_config_changed"
  | "binder_page_turned"
  | "collection_mode_toggled"
  | "card_marked"
  | "checklist_cleared"
  | "card_inspected"
  | "pdf_downloaded"
  | "pdf_download_failed"
  | "print_opened"
  | "share_link_copied"
  | "csv_downloaded"
  | "print_style_changed"
  | "search_opened"
  | "search_performed"
  | "search_result_selected"
  | "set_opened"
  | "series_toggled"
  | "set_overlay_language_changed"
  | "directory_sorted"
  | "popular_entity_clicked"
  | "entity_binder_started"
  | "entity_link_clicked"
  | "setting_changed"
  | "music_toggled"
  | "consent_set"
  | "report_submitted"
  | "report_submit_failed";

type EventProps = Record<string, string | number | boolean | undefined>;

/** Capture a named analytics event. See module header for the consent/no-op
 *  guarantees. */
export function capture(event: AnalyticsEvent, props?: EventProps): void {
  if (!analyticsEnabled()) return;
  try {
    posthog.capture(event, props);
  } catch {
    // best-effort — analytics must never break the app
  }
}
