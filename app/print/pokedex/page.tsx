import "../print.css";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PrintPokedex } from "@/components/print/print-pokedex";
import { buildPokedexEntries, decodePokedexToken, generationById } from "@/lib/pokedex";
import { getLocalizedPokedexCards, getPokedexCards } from "@/lib/tcg";
import { cardLanguagesEnabled } from "@/lib/features";

export const metadata: Metadata = {
  title: "Pokédex print — Nomekop",
  robots: { index: false, follow: false },
};

type Props = {
  searchParams: Promise<{ t?: string; view?: string }>;
};

export default async function PrintPokedexPage({ searchParams }: Props) {
  const { t, view } = await searchParams;
  const config = t ? decodePokedexToken(decodeURIComponent(t)) : null;
  if (!config) notFound();
  const gen = generationById(config.gen)!;
  const lang = cardLanguagesEnabled() ? config.lang : "en";
  const cards =
    lang === "en"
      ? await getPokedexCards(config.gen)
      : await getLocalizedPokedexCards(config.gen, lang);
  const entries = buildPokedexEntries(config.gen, cards, config.picks);
  return (
    <PrintPokedex
      gen={gen}
      entries={entries}
      rows={config.rows}
      cols={config.cols}
      view={view === "placeholders" ? "placeholders" : "binder"}
    />
  );
}
