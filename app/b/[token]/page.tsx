import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BuilderShell } from "@/components/builder-shell";
import { decodeShareToken } from "@/lib/share";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ token: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  const config = decodeShareToken(decodeURIComponent(token));
  if (!config) return { title: "Nomekop" };
  return {
    title: `${config.set} binder layout (${config.rows}×${config.cols}, ${config.mode})`,
    // Token URLs are infinite configuration permutations — keep them out of
    // the index, but let crawlers follow links through to real pages.
    robots: { index: false, follow: true },
  };
}

/** A shared binder layout: the builder, pre-set to the token's configuration.
 *  This IS the canonical address-bar URL while configuring. */
export default async function SharedBinderPage({ params }: Props) {
  const { token } = await params;
  if (!decodeShareToken(decodeURIComponent(token))) notFound();
  return <BuilderShell />;
}
