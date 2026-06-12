"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { DID_YOU_KNOW } from "@/lib/content/stats";

// The fact never changes during a session, so there is nothing to subscribe to.
const subscribe = () => () => {};
// Day-of-epoch index — stable all day, so useSyncExternalStore caches it cleanly.
const getSnapshot = () => Math.floor(Date.now() / 86_400_000) % DID_YOU_KNOW.length;
// Server renders the first fact (stable + crawlable); the client rotates by day.
const getServerSnapshot = () => 0;

/**
 * A small "Did you know?" callout that surfaces a Pokémon TCG fun fact and links
 * to the /facts library. Uses the same external-store pattern as the theme/sound
 * stores so the server render stays pure.
 */
export function DidYouKnow() {
  const index = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  return (
    <aside
      aria-label="Did you know"
      className="flex flex-col gap-1 border-[3px] border-gb-ink bg-gb-accent/40 px-4 py-3"
    >
      <span className="font-pixel text-[10px] uppercase tracking-wide text-gb-ink">
        Did you know?
      </span>
      <p className="font-body text-xl leading-tight text-gb-ink">
        {DID_YOU_KNOW[index]}{" "}
        <Link href="/facts" className="font-pixel text-[10px] underline underline-offset-2">
          MORE FACTS ▶
        </Link>
      </p>
    </aside>
  );
}
