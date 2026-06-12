import "../print.css";
import type { Metadata } from "next";
import { loadPrintData } from "@/app/print/load";
import { PrintPlaceholders } from "@/components/print/print-placeholders";
import { expandOptionsFrom, expandSlots } from "@/lib/layout";

export const metadata: Metadata = {
  title: "Placeholders — Bindermon",
  // Machine-rendered print view (puppeteer/print dialog) — keep out of search.
  robots: { index: false, follow: false },
};

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function PrintPlaceholdersPage({ searchParams }: Props) {
  const { config, set, cards } = await loadPrintData(searchParams);
  const slots = expandSlots(cards, expandOptionsFrom(config, set));
  return <PrintPlaceholders set={set} slots={slots} config={config} />;
}
