import type { Metadata } from "next";
import { BuilderShell } from "@/components/builder-shell";
import { SITE_NAME } from "@/lib/site";

// The sets list comes from a third-party API via our cache — always render
// dynamically so a build without network (or with a cold cache) cannot fail.
export const dynamic = "force-dynamic";

// Title and description inherit from the root layout (og falls back to them
// too). A page-level openGraph replaces the layout's whole object, so restate
// type/siteName to keep those tags on the home page.
export const metadata: Metadata = {
  alternates: { canonical: "/" },
  openGraph: { type: "website", siteName: SITE_NAME, url: "/" },
};

export default function Home() {
  return <BuilderShell />;
}
