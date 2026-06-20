import Link from "next/link";
import { SetFaqCard } from "@/components/faqs/set-faq-card";
import type { FaqSetSummary } from "@/lib/content/faqs/types";

/**
 * Home-page "coming soon" panel: the announced-but-unreleased sets, each linking
 * to its pre-release FAQ hub. Visually distinct from the rest of the page with a
 * dashed frame and accent wash so it reads as a forward-looking section.
 */
export function UpcomingSets({ sets }: { sets: FaqSetSummary[] }) {
  if (sets.length === 0) return null;
  return (
    <section
      aria-label="Upcoming Pokémon TCG sets"
      className="flex flex-col gap-3 border-4 border-dashed border-gb-ink bg-gb-accent/15 p-4"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-pixel text-sm uppercase leading-relaxed">Coming soon</h2>
        <Link
          href="/faqs"
          className="font-pixel text-[10px] uppercase underline underline-offset-2"
        >
          All set FAQs ▶
        </Link>
      </div>
      <p className="font-body text-lg leading-snug">
        The next Pokémon TCG sets on the way — preview what&apos;s confirmed, release dates and chase
        cards before they land.
      </p>
      <ul className="m-0 grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-3">
        {sets.map((set) => (
          <SetFaqCard key={set.id} set={set} />
        ))}
      </ul>
    </section>
  );
}
