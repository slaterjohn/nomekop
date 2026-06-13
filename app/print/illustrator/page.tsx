import "../print.css";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PrintBinder } from "@/components/print/print-binder";
import { PrintPlaceholders } from "@/components/print/print-placeholders";
import { DEFAULT_CONFIG } from "@/lib/config";
import {
  buildIllustratorLayout,
  decodeIllustratorToken,
  displayNameFromSlug,
} from "@/lib/illustrator-binder";
import { searchIllustratorCards } from "@/lib/tcg";
import type { TcgSet } from "@/lib/tcg/types";

export const metadata: Metadata = {
  title: "Illustrator binder print — Nomekop",
  robots: { index: false, follow: false },
};

type Props = {
  searchParams: Promise<{ t?: string; view?: string }>;
};

export default async function PrintIllustratorPage({ searchParams }: Props) {
  const { t, view } = await searchParams;
  const decoded = t ? decodeIllustratorToken(decodeURIComponent(t)) : null;
  if (!decoded) notFound();
  const cards = await searchIllustratorCards(decoded.name, decoded.options.langs);
  if (cards.length === 0) notFound();

  const layout = buildIllustratorLayout(cards, decoded.options);
  const pseudoSet: TcgSet = {
    id: decoded.name,
    name: `${displayNameFromSlug(decoded.name)} — illustrations`,
    series: "Illustrator binder",
    printedTotal: 0,
    total: cards.length,
    releaseDate: "",
    symbolUrl: "",
    logoUrl: "",
  };
  const config = { ...DEFAULT_CONFIG, set: decoded.name, rows: decoded.options.rows, cols: decoded.options.cols };

  if (view === "placeholders") {
    const slots = layout.pages.flatMap((p) => p.slots);
    return <PrintPlaceholders set={pseudoSet} slots={slots} config={config} />;
  }
  return <PrintBinder set={pseudoSet} layout={layout} config={config} />;
}
