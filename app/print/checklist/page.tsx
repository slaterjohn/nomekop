import "../print.css";
import type { Metadata } from "next";
import { loadPrintData } from "@/app/print/load";
import { PrintChecklist } from "@/components/print/print-checklist";
import { expandOptionsFrom, expandSlots } from "@/lib/layout";

export const metadata: Metadata = { title: "Checklist — Bindermon" };

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function PrintChecklistPage({ searchParams }: Props) {
  const { config, set, cards } = await loadPrintData(searchParams);
  const slots = expandSlots(cards, expandOptionsFrom(config, set));
  return <PrintChecklist set={set} slots={slots} config={config} />;
}
