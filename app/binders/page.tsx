import type { Metadata } from "next";
import Link from "next/link";
import { BinderCatalog } from "@/components/binders/binder-catalog";
import { JsonLd } from "@/components/json-ld";
import { getServerDictionary } from "@/lib/i18n/server";
import { breadcrumbJsonLd } from "@/lib/structured-data";
import { BINDERS } from "@/lib/binders";

const TITLE = "Pokémon TCG binders — Vault X buying guide";
const DESCRIPTION =
  "Which binder for your collection? Compare Vault X 4-, 9-, 12- and 16-pocket binders by capacity and price, and jump straight to the right size for the layout you built on NOMEKOP.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/binders" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "/binders" },
};

/** A buying-guide / product page for the binders NOMEKOP recommends. */
export default async function BindersPage() {
  const { dict } = await getServerDictionary();
  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Recommended Pokémon TCG binders",
    itemListElement: BINDERS.map((binder, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "Product",
        name: binder.name,
        brand: { "@type": "Brand", name: binder.brand },
        description: binder.blurb,
        category: `${binder.pockets}-pocket trading card binder`,
      },
    })),
  };

  return (
    <main id="main" className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-4 py-6">
      <JsonLd
        data={[
          itemList,
          breadcrumbJsonLd([
            { name: "NOMEKOP", path: "/" },
            { name: "BINDERS", path: "/binders" },
          ]),
        ]}
      />
      <div>
        <h1 className="font-pixel text-lg uppercase leading-relaxed sm:text-xl">
          {dict.binders.title}
        </h1>
        <p className="mt-1 font-body text-lg">{dict.binders.intro}</p>
        <p className="mt-1 font-body text-lg">
          Building a layout?{" "}
          <Link href="/sets" className="underline underline-offset-2">
            Pick a set
          </Link>{" "}
          or a{" "}
          <Link href="/pokedex" className="underline underline-offset-2">
            Pokédex
          </Link>{" "}
          and each result recommends the binder that fits.
        </p>
      </div>

      <BinderCatalog binders={BINDERS} />

      <p className="font-body text-base leading-tight">
        Prices are RRP guidance, not live — check the retailer. A 9-pocket zip binder is the safe
        default for most collections; size up to 12 or 16 pockets to fit a master set in one book.
      </p>
    </main>
  );
}
