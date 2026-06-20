import type { Metadata } from "next";
import { JsonLd } from "@/components/json-ld";
import { SetFaqCard } from "@/components/faqs/set-faq-card";
import { faqSetsByEra, faqSetSummaries } from "@/lib/content/faqs/registry";
import { breadcrumbJsonLd, faqsIndexSetsJsonLd } from "@/lib/structured-data";

const TITLE = "Pokémon TCG set FAQs";
const DESCRIPTION =
  "Pick a Pokémon TCG set for quick, data-backed answers — how many cards, master-set " +
  "sizes, the best binder size, rarest and chase cards, release dates and more. Grouped " +
  "by era, with upcoming sets marked.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/faqs" },
  openGraph: { type: "website", title: TITLE, description: DESCRIPTION, url: "/faqs" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

/** The FAQ directory: a card per set, grouped into eras (newest first). Each
 *  card links to that set's FAQ hub; upcoming sets are flagged "coming soon".
 *  Replaces the old single long list with a browse-by-set surface. */
export default function FaqsIndexPage() {
  const eras = faqSetsByEra();
  const summaries = faqSetSummaries();

  return (
    <main id="main" className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 py-6">
      <header className="flex flex-col gap-2">
        <h1 className="font-pixel text-lg uppercase leading-relaxed sm:text-xl">{TITLE}</h1>
        <p className="font-readable text-lg leading-snug">{DESCRIPTION}</p>
      </header>

      {eras.map((group) => (
        <section key={group.era} className="flex flex-col gap-3">
          <h2 className="border-b-[3px] border-gb-ink pb-2 font-pixel text-sm uppercase leading-relaxed">
            {group.era}
          </h2>
          <ul className="m-0 grid list-none grid-cols-2 gap-3 p-0 sm:grid-cols-3">
            {group.sets.map((set) => (
              <SetFaqCard key={set.id} set={set} />
            ))}
          </ul>
        </section>
      ))}

      <JsonLd
        data={[
          faqsIndexSetsJsonLd(summaries.map((s) => ({ id: s.id, fullName: s.fullName }))),
          breadcrumbJsonLd([
            { name: "NOMEKOP", path: "/" },
            { name: "FAQs", path: "/faqs" },
          ]),
        ]}
      />
    </main>
  );
}
