import type { Metadata } from "next";
import Link from "next/link";
import { GbScreen } from "@/components/gb/gb-screen";
import { GbLinkButton } from "@/components/gb/gb-button";
import { IllustratorSearchForm } from "@/components/illustrator/illustrator-search-form";
import { encodeIllustratorToken, DEFAULT_ILLUSTRATOR_OPTIONS } from "@/lib/illustrator-binder";
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

/** Landing page: search any illustrator, or jump to a prolific one. */
export default async function IllustratorLandingPage() {
  const { dict } = await getServerDictionary();
  return (
    <main id="main" className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-6">
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
          <IllustratorSearchForm />
          <p className="font-pixel text-[10px] uppercase">{dict.common.popular}</p>
          <div className="flex flex-wrap gap-2">
            {POPULAR.map((name) => (
              <GbLinkButton
                key={name}
                variant="b"
                size="sm"
                href={`/illustrator/${encodeIllustratorToken(name, DEFAULT_ILLUSTRATOR_OPTIONS)}`}
              >
                {name}
              </GbLinkButton>
            ))}
          </div>
        </div>
      </GbScreen>
    </main>
  );
}
