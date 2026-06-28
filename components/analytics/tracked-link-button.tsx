"use client";

import type { ComponentProps } from "react";
import { GbLinkButton } from "@/components/gb/gb-button";
import { capture, type AnalyticsEvent } from "@/lib/analytics/events";

type Props = ComponentProps<typeof GbLinkButton> & {
  /** Named event to capture on click. */
  event: AnalyticsEvent;
  /** Structured properties for the event. */
  eventProps?: Record<string, string | number | boolean | undefined>;
};

/** A GbLinkButton that emits a named analytics event on click, then navigates.
 *  Lets server pages attach analytics to a link without becoming client
 *  components themselves (the handler lives here). */
export function TrackedLinkButton({ event, eventProps, onClick, ...rest }: Props) {
  return (
    <GbLinkButton
      {...rest}
      onClick={(e) => {
        capture(event, eventProps);
        onClick?.(e);
      }}
    />
  );
}
