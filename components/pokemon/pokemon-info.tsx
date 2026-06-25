import Image from "next/image";
import Link from "next/link";
import { JsonLd } from "@/components/json-ld";
import { GbScreen } from "@/components/gb/gb-screen";
import { GbLinkButton } from "@/components/gb/gb-button";
import { StatGrid, type Stat } from "@/components/entities/stat-grid";
import { EntityCardGallery } from "@/components/entities/entity-card-gallery";
import { EntityFaqSection } from "@/components/entities/entity-faq-section";
import { SetLink } from "@/components/entities/entity-link";
import { breadcrumbJsonLd, faqJsonLd } from "@/lib/structured-data";
import { pokemonFaqEntries } from "@/lib/content/entities/faq";
import { getPokemonCardsByDex } from "@/lib/tcg";
import { encodePokemonToken, DEFAULT_POKEMON_OPTIONS } from "@/lib/pokemon-binder";
import type { PokemonEntity } from "@/lib/content/entities/types";

function setLink(set: { id: string; name: string; releaseDate: string }, withYear = false) {
  const label = set.name === "Base" ? "Base Set" : set.name;
  return (
    <SetLink id={set.id}>
      {label}
      {withYear ? ` (${set.releaseDate.slice(0, 4)})` : ""}
    </SetLink>
  );
}

/** Pokémon information page (the bare-slug branch of /pokemon/[token]): stats,
 *  data-backed FAQs, a link to every card, and a shortcut into the binder. */
export async function PokemonInfo({ entity }: { entity: PokemonEntity }) {
  const cards = await getPokemonCardsByDex(entity.dex);
  const sorted = [...cards].sort(
    (a, b) =>
      b.setReleaseDate.localeCompare(a.setReleaseDate) ||
      a.number.localeCompare(b.number, undefined, { numeric: true }),
  );
  const faqs = pokemonFaqEntries(entity);
  const binderHref = `/pokemon/${encodePokemonToken(entity.name, DEFAULT_POKEMON_OPTIONS)}`;

  const stats: Stat[] = [
    { label: "Cards", value: entity.cardCount },
    { label: "Sets", value: entity.setCount },
    { label: "Artists", value: entity.artistCount },
  ];
  if (entity.sirCount > 0) stats.push({ label: "Special Illustration Rares", value: entity.sirCount });
  if (entity.firstSet) stats.push({ label: "First set", value: setLink(entity.firstSet, true) });
  if (entity.latestSet) stats.push({ label: "Latest set", value: setLink(entity.latestSet) });

  return (
    <main id="main" className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-6">
      <JsonLd
        data={[
          faqJsonLd(faqs),
          breadcrumbJsonLd([
            { name: "NOMEKOP", path: "/" },
            { name: "Pokémon", path: "/pokemon" },
            { name: entity.name, path: `/pokemon/${entity.slug}` },
          ]),
        ]}
      />
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-3 font-pixel text-sm uppercase">
        <Link href="/pokemon" className="no-underline">
          ◂ All Pokémon
        </Link>
      </nav>

      <header className="flex flex-wrap items-center gap-4">
        {entity.signatureCard?.imageSmall ? (
          <Link href={`/card/${entity.signatureCard.id}`} className="shrink-0 no-underline">
            <Image
              src={entity.signatureCard.imageSmall}
              alt={`${entity.name} — ${entity.signatureCard.name}`}
              width={96}
              height={134}
              unoptimized
              className="h-auto w-24 border-2 border-gb-ink"
            />
          </Link>
        ) : null}
        <div className="min-w-0">
          <p className="font-pixel text-[10px] uppercase leading-relaxed">No. {String(entity.dex).padStart(4, "0")}</p>
          <h1 className="font-pixel text-lg uppercase leading-relaxed sm:text-xl">{entity.name}</h1>
          <p className="mt-1 font-body text-lg leading-none">
            {entity.cardCount} cards across {entity.setCount} sets
          </p>
        </div>
      </header>

      <GbScreen title="Stats">
        <StatGrid stats={stats} />
      </GbScreen>

      <EntityFaqSection heading={`Common questions about ${entity.name} cards`} entries={faqs} />

      <div className="flex flex-wrap gap-2">
        <GbLinkButton variant="a" href={binderHref}>
          Build a {entity.name} binder
        </GbLinkButton>
      </div>

      {sorted.length > 0 ? (
        <GbScreen title={`${entity.name} cards (${sorted.length})`}>
          <EntityCardGallery cards={sorted} />
        </GbScreen>
      ) : null}
    </main>
  );
}
