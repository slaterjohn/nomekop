import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { PokemonBinderView } from "@/components/pokemon/pokemon-binder-view";
import { PokemonNoResults } from "@/components/pokemon/pokemon-no-results";
import { BinderSkeleton } from "@/components/binder-skeleton";
import { BackButton } from "@/components/back-button";
import {
  decodePokemonToken,
  displayNameFromSlug,
  encodePokemonToken,
  DEFAULT_POKEMON_OPTIONS,
  type PokemonBinderOptions,
} from "@/lib/pokemon-binder";
import { searchPokemonCards } from "@/lib/tcg";
import { cardLanguagesEnabled } from "@/lib/features";
import { getServerDictionary } from "@/lib/i18n/server";
import { format } from "@/lib/i18n/format";
import { getPokemonEntity } from "@/lib/content/entities/registry";
import { PokemonInfo } from "@/components/pokemon/pokemon-info";

/** Drop any non-English card languages from a token when the feature is off, so
 *  a hand-typed/stale multi-language URL still renders a clean English binder. */
function gateLangs(options: PokemonBinderOptions): PokemonBinderOptions {
  return cardLanguagesEnabled() ? options : { ...options, langs: ["en"] };
}

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ token: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  const raw = decodeURIComponent(token);
  const decoded = decodePokemonToken(raw);
  if (decoded) {
    const name = displayNameFromSlug(decoded.name);
    return {
      title: `${name} binder — every card in one layout`,
      description: `Build a printable binder of every ${name} card across all Pokemon TCG sets: secrets only or rarest per set, newest or oldest first, A4 pages and placeholders.`,
      alternates: { canonical: `/pokemon/${encodeURIComponent(token)}` },
    };
  }
  // Bare slug → the Pokémon information page.
  const entity = getPokemonEntity(raw);
  if (entity) {
    const title = `${entity.name} Pokémon cards — ${entity.cardCount} cards across ${entity.setCount} sets`;
    return {
      title,
      description:
        `Every ${entity.name} Pokemon TCG card: ${entity.cardCount} cards across ${entity.setCount} sets by ` +
        `${entity.artistCount} artists, with prices, the rarest prints, FAQs, and a printable binder.`,
      alternates: { canonical: `/pokemon/${entity.slug}` },
      openGraph: { title, url: `/pokemon/${entity.slug}` },
    };
  }
  return { title: "Pokémon" };
}

/** The slow part — searches every set for this Pokémon. Isolated in its own
 *  async component so the page shell + skeleton stream instantly while it runs. */
async function PokemonBinderData({
  slug,
  displayName,
  options,
}: {
  slug: string;
  displayName: string;
  options: PokemonBinderOptions;
}) {
  const cards = await searchPokemonCards(slug, options.langs);

  if (cards.length === 0) {
    return <PokemonNoResults query={displayName} />;
  }

  const langCount = new Set(cards.map((c) => c.lang ?? "en")).size;
  const { dict } = await getServerDictionary();
  const langs = langCount > 1 ? ` ${format(dict.binder.inLanguages, { count: langCount })}` : "";
  return (
    <>
      <p className="font-body text-xl leading-tight">
        {format(dict.binder.pokemonSubline, {
          name: displayName,
          sets: new Set(cards.map((c) => c.setId)).size,
          cards: cards.length,
          langs,
        })}
      </p>
      <PokemonBinderView slug={slug} displayName={displayName} cards={cards} initialOptions={options} />
    </>
  );
}

/** Dispatches the /pokemon/[token] segment: a decodable token renders the
 *  binder; a bare Pokémon slug renders the information page; anything else 404s. */
export default async function PokemonRoutePage({ params }: Props) {
  const { token } = await params;
  const raw = decodeURIComponent(token);
  const decoded = decodePokemonToken(raw);
  if (!decoded) {
    const entity = getPokemonEntity(raw);
    if (entity) return <PokemonInfo entity={entity} />;
    // No info page for this slug (cardless species / free-text / typo) — fall
    // back to the binder, which handles any name (and shows "no results" if none).
    redirect(`/pokemon/${encodePokemonToken(raw, DEFAULT_POKEMON_OPTIONS)}`);
  }
  const displayName = displayNameFromSlug(decoded.name);
  const { dict } = await getServerDictionary();

  return (
    <main id="main" className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-6">
      <div className="flex flex-wrap items-center justify-end gap-3">
        <BackButton fallbackHref="/pokemon" />
      </div>

      <h1 className="font-pixel text-lg uppercase leading-relaxed sm:text-xl">
        {format(dict.binder.heading, { name: displayName })}
      </h1>

      <Suspense
        fallback={
          <BinderSkeleton
            what={`every ${displayName} print`}
            rows={decoded.options.rows}
            cols={decoded.options.cols}
          />
        }
      >
        <PokemonBinderData slug={decoded.name} displayName={displayName} options={gateLangs(decoded.options)} />
      </Suspense>
    </main>
  );
}
