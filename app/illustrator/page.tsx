import type { Metadata } from "next";
import Link from "next/link";
import { GbScreen } from "@/components/gb/gb-screen";
import { GbLinkButton } from "@/components/gb/gb-button";
import { SiteSearchBox } from "@/components/search/site-search-box";
import { ArtistDirectory, parseArtistSort } from "@/components/illustrator/artist-directory";
import { SortTabs } from "@/components/entities/sort-tabs";
import { TrailRecorder } from "@/components/breadcrumbs";
import { artistSlugByName } from "@/lib/content/entities/catalog";
import { getServerDictionary } from "@/lib/i18n/server";

const TITLE = "Illustrator binders — every card by an artist";
const DESCRIPTION =
  "Pick a Pokemon TCG illustrator and build a printable binder of every card they have ever drawn — across every set, newest or oldest first.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/illustrator" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "/illustrator" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

const POPULAR = [
  "Ken Sugimori",
  "Mitsuhiro Arita",
  "5ban Graphics",
  "Kagemaru Himeno",
  "Atsuko Nishida",
  "Naoki Saito",
];

/** Landing page: search any illustrator, jump to a prolific one, or browse them all. */
export default async function IllustratorLandingPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string }>;
}) {
  const { dict } = await getServerDictionary();
  const sort = parseArtistSort((await searchParams).sort);
  return (
    <main id="main" className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-6">
      <TrailRecorder label="All illustrators" />
      <h1 className="font-pixel text-lg uppercase leading-relaxed sm:text-xl">
        {dict.illustratorLanding.title}
      </h1>
      <p className="font-body text-xl leading-tight">{dict.illustratorLanding.intro}</p>
      <p className="font-body text-xl leading-tight">
        <Link
          href="/facts/most-prolific-pokemon-illustrators"
          className="underline underline-offset-2"
        >
          {dict.illustratorLanding.factLink}
        </Link>
      </p>

      <GbScreen title={dict.illustratorLanding.chooseHeading}>
        <div className="flex flex-col gap-4">
          <SiteSearchBox scope="artist" placeholder="Search illustrators…" />
          <p className="font-pixel text-[10px] uppercase">{dict.common.popular}</p>
          <div className="flex flex-wrap gap-2">
            {POPULAR.map((name) => (
              <GbLinkButton key={name} variant="b" size="sm" href={`/illustrator/${artistSlugByName(name) ?? ""}`}>
                {name}
              </GbLinkButton>
            ))}
          </div>
        </div>
      </GbScreen>

      <GbScreen title="Browse every illustrator">
        <div className="flex flex-col gap-4">
          <SortTabs
            basePath="/illustrator"
            current={sort}
            options={[
              { value: "cards", label: "Most cards" },
              { value: "name", label: "A–Z" },
              { value: "sets", label: "Most sets" },
            ]}
          />
          <ArtistDirectory sort={sort} />
        </div>
      </GbScreen>
    </main>
  );
}
