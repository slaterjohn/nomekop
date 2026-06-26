import Link from "next/link";
import { pokemonCatalog } from "@/lib/content/entities/catalog";
import { GENERATIONS } from "@/lib/pokedex";
import type { PokemonCatalogEntry } from "@/lib/content/entities/types";

export type PokemonSort = "dex" | "cards";

export function parsePokemonSort(value: string | undefined): PokemonSort {
  return value === "cards" ? "cards" : "dex";
}

function dexLabel(dex: number): string {
  return `#${String(dex).padStart(4, "0")}`;
}

function Row({ p }: { p: PokemonCatalogEntry }) {
  return (
    <li>
      <Link
        href={`/pokemon/${encodeURIComponent(p.slug)}`}
        className="flex items-baseline justify-between gap-2 border-2 border-gb-ink px-2 py-1 no-underline"
      >
        <span className="truncate font-body text-base leading-tight">
          <span className="font-pixel text-[8px] text-gb-ink/60">{dexLabel(p.dex)}</span> {p.name}
        </span>
        <span className="shrink-0 font-pixel text-[8px] text-gb-ink/60">{p.cardCount}</span>
      </Link>
    </li>
  );
}

const grid = "m-0 grid list-none grid-cols-1 gap-1 p-0 sm:grid-cols-2 md:grid-cols-3";

/** Browsable directory of every Pokémon with cards. Default: Pokédex order,
 *  grouped by generation; "cards" sort: a flat most-cards-first list. */
export function PokemonDirectory({ sort }: { sort: PokemonSort }) {
  const all = pokemonCatalog();

  if (sort === "cards") {
    const ranked = [...all].sort((a, b) => b.cardCount - a.cardCount || a.dex - b.dex);
    return (
      <ul className={grid}>
        {ranked.map((p) => (
          <Row key={p.slug} p={p} />
        ))}
      </ul>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {GENERATIONS.map((gen) => {
        const members = all
          .filter((p) => p.dex >= gen.min && p.dex <= gen.max)
          .sort((a, b) => a.dex - b.dex);
        if (members.length === 0) return null;
        return (
          <section key={gen.id} className="flex flex-col gap-2">
            <h3 className="font-pixel text-[11px] uppercase leading-relaxed">
              {gen.label} · {gen.region}
            </h3>
            <ul className={grid}>
              {members.map((p) => (
                <Row key={p.slug} p={p} />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
