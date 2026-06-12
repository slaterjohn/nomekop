import "../print.css";
import type { Metadata } from "next";
import { loadPrintData } from "@/app/print/load";
import { PrintBinder } from "@/components/print/print-binder";
import { buildBinderLayout } from "@/lib/layout";

export const metadata: Metadata = {
  title: "Binder pages — Nomekop",
  // Machine-rendered print view (puppeteer/print dialog) — keep out of search.
  robots: { index: false, follow: false },
};

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function PrintBinderPage({ searchParams }: Props) {
  const { config, set, cards } = await loadPrintData(searchParams);
  const layout = buildBinderLayout(cards, set, config);
  return <PrintBinder set={set} layout={layout} config={config} />;
}
