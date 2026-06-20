"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";

export type SpotlightItem = { slug: string; question: string; answer: string };

// Nothing to subscribe to — the pick only changes across days.
const subscribe = () => () => {};
// Day-of-epoch index, stable all day, so useSyncExternalStore caches it cleanly.
// Built outside render so the Date read stays off the component's render path.
function makeDaySnapshot(length: number) {
  return () => Math.floor(Date.now() / 86_400_000) % length;
}
// Server renders the first question (stable + crawlable); the client rotates by day.
const getServerSnapshot = () => 0;

/**
 * A home-page spotlight surfacing one question from the newest set, rotating by
 * day (same external-store trick as the "Did you know?" tip so the server render
 * stays pure). The full set of questions lives on the set's FAQ hub.
 */
export function SetFaqSpotlight({
  setName,
  hubHref,
  items,
}: {
  setName: string;
  hubHref: string;
  items: SpotlightItem[];
}) {
  const index = useSyncExternalStore(subscribe, makeDaySnapshot(items.length), getServerSnapshot);
  const item = items[index] ?? items[0];
  if (!item) return null;

  return (
    <section
      aria-label={`FAQ spotlight: ${setName}`}
      className="flex flex-col gap-2 border-4 border-gb-ink bg-gb-bg p-4 shadow-[4px_4px_0_0_var(--gb-ink)]"
    >
      <span className="inline-flex w-fit items-center gap-2 border-2 border-gb-ink bg-gb-ink px-2 py-0.5 font-pixel text-[10px] uppercase leading-none text-gb-bg">
        Latest set · {setName}
      </span>
      <h2 className="font-pixel text-sm uppercase leading-relaxed">
        <Link href={`/faqs/${item.slug}`} className="no-underline hover:underline">
          {item.question}
        </Link>
      </h2>
      <p className="font-body text-xl leading-snug">{item.answer}</p>
      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
        <Link
          href={`/faqs/${item.slug}`}
          className="font-pixel text-[10px] uppercase underline underline-offset-2"
        >
          Read the full answer ▶
        </Link>
        <Link
          href={hubHref}
          className="font-pixel text-[10px] uppercase underline underline-offset-2"
        >
          All {setName} FAQs ▶
        </Link>
      </div>
    </section>
  );
}
