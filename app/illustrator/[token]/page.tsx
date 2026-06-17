import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { IllustratorBinderView } from "@/components/illustrator/illustrator-binder-view";
import { BinderSkeleton } from "@/components/binder-skeleton";
import { BackButton } from "@/components/back-button";
import { GbDialogBox } from "@/components/gb/gb-dialog-box";
import {
  decodeIllustratorToken,
  displayNameFromSlug,
  type IllustratorBinderOptions,
} from "@/lib/illustrator-binder";
import { searchIllustratorCards } from "@/lib/tcg";
import { cardLanguagesEnabled } from "@/lib/features";
import { getServerDictionary } from "@/lib/i18n/server";
import { format } from "@/lib/i18n/format";

/** Drop any non-English card languages from a token when the feature is off, so
 *  a hand-typed/stale multi-language URL still renders a clean English binder. */
function gateLangs(options: IllustratorBinderOptions): IllustratorBinderOptions {
  return cardLanguagesEnabled() ? options : { ...options, langs: ["en"] };
}

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ token: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  const decoded = decodeIllustratorToken(decodeURIComponent(token));
  if (!decoded) return { title: "Illustrator binder" };
  const name = displayNameFromSlug(decoded.name);
  return {
    title: `${name} binder — every card by this illustrator`,
    description: `Build a printable binder of every Pokemon TCG card illustrated by ${name}, across all sets, newest or oldest first, with A4 pages and placeholders.`,
    alternates: { canonical: `/illustrator/${encodeURIComponent(token)}` },
  };
}

/** The slow part — searches every set for this artist. Isolated so the page
 *  shell + skeleton stream instantly while it runs. */
async function IllustratorBinderData({
  slug,
  displayName,
  options,
}: {
  slug: string;
  displayName: string;
  options: IllustratorBinderOptions;
}) {
  const cards = await searchIllustratorCards(slug, options.langs);

  if (cards.length === 0) {
    return (
      <GbDialogBox>
        WILD MISSINGNO. APPEARED! No cards found for that illustrator. Check the spelling or try
        another artist.
      </GbDialogBox>
    );
  }

  const langCount = new Set(cards.map((c) => c.lang ?? "en")).size;
  const { dict } = await getServerDictionary();
  const langs = langCount > 1 ? ` ${format(dict.binder.inLanguages, { count: langCount })}` : "";
  return (
    <>
      <p className="font-body text-xl leading-tight">
        {format(dict.binder.illustratorSubline, {
          name: displayName,
          sets: new Set(cards.map((c) => c.setId)).size,
          cards: cards.length,
          langs,
        })}
      </p>
      <IllustratorBinderView
        slug={slug}
        displayName={displayName}
        cards={cards}
        initialOptions={options}
      />
    </>
  );
}

/** A binder for every card one illustrator has ever drawn, across all sets. */
export default async function IllustratorBinderPage({ params }: Props) {
  const { token } = await params;
  const decoded = decodeIllustratorToken(decodeURIComponent(token));
  if (!decoded) notFound();
  const displayName = displayNameFromSlug(decoded.name);
  const { dict } = await getServerDictionary();

  return (
    <main id="main" className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-6">
      <div className="flex flex-wrap items-center justify-end gap-3">
        <BackButton fallbackHref="/illustrator" />
      </div>

      <h1 className="font-pixel text-lg uppercase leading-relaxed sm:text-xl">
        {format(dict.binder.heading, { name: displayName })}
      </h1>

      <Suspense
        fallback={
          <BinderSkeleton
            what={`every card by ${displayName}`}
            rows={decoded.options.rows}
            cols={decoded.options.cols}
          />
        }
      >
        <IllustratorBinderData slug={decoded.name} displayName={displayName} options={gateLangs(decoded.options)} />
      </Suspense>
    </main>
  );
}
