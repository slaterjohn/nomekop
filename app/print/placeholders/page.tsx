import "../print.css";
import type { Metadata } from "next";
import { loadPrintData } from "@/app/print/load";
import { PrintPlaceholders } from "@/components/print/print-placeholders";
import { expandSlots } from "@/lib/layout";

export const metadata: Metadata = { title: "Placeholders — Bindermon" };

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function PrintPlaceholdersPage({ searchParams }: Props) {
  const { config, set, cards } = await loadPrintData(searchParams);
  const slots = expandSlots(cards, config.mode, config.secrets, set.printedTotal);
  return <PrintPlaceholders set={set} slots={slots} config={config} />;
}
