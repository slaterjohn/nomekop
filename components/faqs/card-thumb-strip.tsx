import Image from "next/image";
import Link from "next/link";
import type { FaqCardRef } from "@/lib/content/faqs/types";

/** A horizontal strip of card scans, each linking to that card's page. Skips
 *  cards with no scan; renders nothing if none have one. */
export function CardThumbStrip({ cards, limit = 6 }: { cards: FaqCardRef[]; limit?: number }) {
  const shown = cards.filter((c) => c.imageSmall).slice(0, limit);
  if (shown.length === 0) return null;
  return (
    <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
      {shown.map((card) => (
        <li key={card.id}>
          <Link
            href={`/card/${card.id}`}
            aria-label={`${card.name} (#${card.number})`}
            className="block no-underline motion-safe:transition-transform motion-safe:hover:-translate-y-0.5"
          >
            <Image
              src={card.imageSmall!}
              alt={`${card.name} #${card.number}`}
              width={245}
              height={342}
              unoptimized
              loading="lazy"
              className="h-auto w-20 border-2 border-gb-ink"
            />
          </Link>
        </li>
      ))}
    </ul>
  );
}
