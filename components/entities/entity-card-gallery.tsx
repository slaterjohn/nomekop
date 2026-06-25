import Image from "next/image";
import Link from "next/link";
import type { CardWithSet } from "@/lib/tcg/types";

/** A responsive grid of card thumbnails, each linking to its /card/[id] page —
 *  the server-rendered trail crawlers follow, and the visual link web for a
 *  cross-set entity (Pokémon / artist). Shows the set under each card so the
 *  same print across sets is distinguishable. */
export function EntityCardGallery({ cards }: { cards: ReadonlyArray<CardWithSet> }) {
  return (
    <ul className="m-0 grid list-none grid-cols-3 gap-2 p-0 sm:grid-cols-5 md:grid-cols-6">
      {cards.map((card) => (
        <li key={card.id}>
          <Link href={`/card/${card.id}`} className="flex h-full flex-col gap-1 no-underline">
            {card.imageSmall ? (
              <Image
                src={card.imageSmall}
                alt={`${card.name} · ${card.setName} #${card.number}`}
                width={245}
                height={342}
                unoptimized
                loading="lazy"
                className="h-auto w-full border-2 border-gb-ink"
              />
            ) : (
              <span
                aria-hidden="true"
                className="flex aspect-[63/88] items-center justify-center border-2 border-dashed border-gb-muted p-1 text-center font-pixel text-[8px] uppercase leading-relaxed"
              >
                No scan
              </span>
            )}
            <span className="block truncate font-body text-base leading-tight">{card.name}</span>
            <span className="block truncate font-pixel text-[8px] leading-none">
              {card.setName} #{card.number}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
