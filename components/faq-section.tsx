import Link from "next/link";
import { GbScreen } from "@/components/gb/gb-screen";
import { APP_INTRO, FAQ_ENTRIES } from "@/lib/faq";

/**
 * Static intro + FAQ rendered below the builder. Server component: native
 * details/summary gives an accessible accordion with zero client JS, and the
 * copy lands in the initial HTML for crawlers.
 */
export function FaqSection() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 pb-10">
      <GbScreen title="HOW BINDERMON WORKS">
        <p className="font-body text-xl leading-relaxed">{APP_INTRO}</p>

        <h3 className="mt-6 border-b-2 border-gb-ink pb-2 font-pixel text-xs">FAQ</h3>
        <div className="divide-y-2 divide-gb-ink border-b-2 border-gb-ink">
          {FAQ_ENTRIES.map((entry, index) => (
            <details key={entry.question} open={index === 0}>
              <summary className="cursor-pointer py-2 font-pixel text-xs leading-relaxed">
                {entry.question}
              </summary>
              <p className="pb-3 font-body text-xl leading-relaxed">{entry.answer}</p>
            </details>
          ))}
        </div>

        <p className="mt-6">
          <Link href="/sets" className="font-pixel text-xs">
            Browse all sets ▶
          </Link>
        </p>
      </GbScreen>
    </div>
  );
}
