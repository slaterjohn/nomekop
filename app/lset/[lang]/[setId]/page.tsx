import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { BinderSkeleton } from "@/components/binder-skeleton";
import { BackButton } from "@/components/back-button";
import { GbDialogBox } from "@/components/gb/gb-dialog-box";
import { LocalizedSetBinderView } from "@/components/sets/localized-set-binder-view";
import { getSetCards } from "@/lib/tcg/tcgdex";
import { isLanguage, languageByCode } from "@/lib/tcg/languages";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ lang: string; setId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, setId } = await params;
  const language = languageByCode(lang);
  return {
    title: language ? `${setId} — ${language.label} set binder` : "Set binder",
    // Localized set binders are dynamic + on-demand; keep them out of the index.
    robots: { index: false, follow: true },
  };
}

/** The slow part — fetches the set's cards from TCGdex. Isolated so the shell +
 *  skeleton stream while it runs. */
async function LocalizedSetData({ lang, setId }: { lang: string; setId: string }) {
  const cards = await getSetCards(setId, lang);
  if (cards.length === 0) {
    return (
      <GbDialogBox>
        WILD MISSINGNO. APPEARED! No cards found for that set in this language.
      </GbDialogBox>
    );
  }
  return (
    <>
      <p className="font-body text-xl leading-tight">
        {cards[0]!.setName} — {cards.length} cards. From TCGdex; no prices.
      </p>
      <LocalizedSetBinderView lang={lang} setId={setId} setName={cards[0]!.setName} cards={cards} />
    </>
  );
}

/** A binder for one localized (non-English) set. */
export default async function LocalizedSetPage({ params }: Props) {
  const { lang, setId } = await params;
  if (!isLanguage(lang) || lang === "en") notFound();
  if (!/^[A-Za-z0-9.-]{1,20}$/.test(setId)) notFound();
  const language = languageByCode(lang)!;

  return (
    <main id="main" className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-6">
      <div className="flex flex-wrap items-center justify-end gap-3">
        <BackButton fallbackHref="/sets" />
      </div>

      <h1 className="font-pixel text-lg leading-relaxed sm:text-xl">
        {setId.toUpperCase()} · {language.native}
      </h1>

      <Suspense fallback={<BinderSkeleton what={`${language.label} cards`} rows={3} cols={4} />}>
        <LocalizedSetData lang={lang} setId={setId} />
      </Suspense>
    </main>
  );
}
