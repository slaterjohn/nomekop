import type { Metadata } from "next";
import Link from "next/link";
import { GbScreen } from "@/components/gb/gb-screen";
import { TrackedLinkButton } from "@/components/analytics/tracked-link-button";
import { SiteSearchBox } from "@/components/search/site-search-box";
import { PokemonDirectory, parsePokemonSort } from "@/components/pokemon/pokemon-directory";
import { SortTabs } from "@/components/entities/sort-tabs";
import { TrailRecorder } from "@/components/breadcrumbs";
import { pokemonSlugByName } from "@/lib/content/entities/catalog";
import { getServerDictionary } from "@/lib/i18n/server";

const TITLE = "Pokémon binders — every card of one Pokémon";
const DESCRIPTION =
  "Pick a Pokémon and build a printable binder of every card it has ever appeared on — all prints, secrets only, or the rarest per set, newest or oldest first.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/pokemon" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "/pokemon" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

const POPULAR = [
  "Pikachu",
  "Charizard",
  "Eevee",
  "Mew",
  "Gengar",
  "Umbreon",
  "Rayquaza",
  "Lucario",
];

/** Landing page: search any Pokémon, jump to a popular one, or browse them all. */
export default async function PokemonLandingPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string }>;
}) {
  const { dict } = await getServerDictionary();
  const sort = parsePokemonSort((await searchParams).sort);
  return (
    <main id="main" className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-6">
      <TrailRecorder label="All Pokémon" />
      <h1 className="font-pixel text-lg uppercase leading-relaxed sm:text-xl">{dict.pokemonLanding.title}</h1>
      <p className="font-body text-xl leading-tight">
        {dict.pokemonLanding.intro}
      </p>
      <p className="font-body text-xl leading-tight">
        <Link href="/facts/most-printed-pokemon" className="underline underline-offset-2">
          {dict.pokemonLanding.factLink}
        </Link>
      </p>

      <GbScreen title={dict.pokemonLanding.chooseHeading}>
        <div className="flex flex-col gap-4">
          <SiteSearchBox scope="pokemon" placeholder="Search Pokémon…" />
          <p className="font-pixel text-[10px] uppercase">{dict.common.popular}</p>
          <div className="flex flex-wrap gap-2">
            {POPULAR.map((name) => (
              <TrackedLinkButton
                key={name}
                variant="b"
                size="sm"
                href={`/pokemon/${pokemonSlugByName(name) ?? ""}`}
                event="popular_entity_clicked"
                eventProps={{ type: "pokemon", name }}
              >
                {name}
              </TrackedLinkButton>
            ))}
          </div>
        </div>
      </GbScreen>

      <GbScreen title="Browse every Pokémon">
        <div className="flex flex-col gap-4">
          <SortTabs
            basePath="/pokemon"
            current={sort}
            options={[
              { value: "dex", label: "Pokédex no." },
              { value: "cards", label: "Most cards" },
            ]}
          />
          <PokemonDirectory sort={sort} />
        </div>
      </GbScreen>
    </main>
  );
}
