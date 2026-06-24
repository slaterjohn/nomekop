import type { Metadata } from "next";
import { GbScreen } from "@/components/gb/gb-screen";
import { GbLinkButton } from "@/components/gb/gb-button";
import { JsonLd } from "@/components/json-ld";
import { breadcrumbJsonLd, webPageJsonLd } from "@/lib/structured-data";
import { GENERATIONS } from "@/lib/pokedex";
import { getServerDictionary } from "@/lib/i18n/server";

const TITLE = "Pokédex binders — one pocket per Pokémon";
const DESCRIPTION =
  "Build a printable Pokédex binder: one pocket for every Pokémon in National Dex order, defaulting to each Pokémon's secret or rarest card — swap any pick, share the link.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/pokedex" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "/pokedex" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

/** Generation chooser — each leads to a default Pokédex binder token. */
export default async function PokedexLandingPage() {
  const { dict } = await getServerDictionary();
  return (
    <main id="main" className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-6">
      <JsonLd
        data={[
          webPageJsonLd(TITLE, "/pokedex", DESCRIPTION),
          breadcrumbJsonLd([
            { name: "NOMEKOP", path: "/" },
            { name: "Pokédex", path: "/pokedex" },
          ]),
        ]}
      />
      <h1 className="font-pixel text-lg uppercase leading-relaxed sm:text-xl">
        {dict.pokedexLanding.title}
      </h1>
      <p className="font-body text-xl leading-tight">{dict.pokedexLanding.intro}</p>

      <GbScreen title={dict.pokedexLanding.chooseGeneration}>
        <ul className="grid list-none grid-cols-1 gap-2 p-0 sm:grid-cols-3">
          {GENERATIONS.map((gen) => (
            <li key={gen.id}>
              <GbLinkButton
                variant="b"
                href={`/pokedex/${gen.id}~34`}
                className="w-full flex-col gap-1 py-3"
              >
                <span>{gen.label}</span>
                <span className="font-body text-lg normal-case">
                  {gen.region} · #{gen.min}–{gen.max}
                </span>
              </GbLinkButton>
            </li>
          ))}
        </ul>
      </GbScreen>
    </main>
  );
}
