import type { Metadata } from "next";
import Link from "next/link";
import { ARTICLES } from "@/lib/content/articles";
import { JsonLd } from "@/components/json-ld";
import { breadcrumbJsonLd, factsCollectionJsonLd } from "@/lib/structured-data";
import { getServerDictionary } from "@/lib/i18n/server";

const FACTS_TITLE = "Pokémon TCG fun facts & trivia";
const FACTS_DESCRIPTION =
  "Data-driven Pokémon TCG trivia from NOMEKOP — the first Pikachu card, how many Charizard cards exist, the most prolific illustrators, biggest sets and more.";

export const metadata: Metadata = {
  title: FACTS_TITLE,
  description: FACTS_DESCRIPTION,
  alternates: { canonical: "/facts" },
  openGraph: {
    type: "website",
    title: FACTS_TITLE,
    description: FACTS_DESCRIPTION,
    url: "/facts",
  },
  twitter: {
    card: "summary_large_image",
    title: FACTS_TITLE,
    description: FACTS_DESCRIPTION,
  },
};

/** The fun-facts library: one card per DB-driven trivia article. */
export default async function FactsIndexPage() {
  const { dict } = await getServerDictionary();
  return (
    <main id="main" className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-6">
      <h1 className="font-pixel text-lg uppercase leading-relaxed sm:text-xl">{dict.facts.title}</h1>
      <p className="font-body text-xl leading-tight">{dict.facts.intro}</p>

      <ul className="flex list-none flex-col gap-3 p-0">
        {ARTICLES.map((article) => (
          <li key={article.slug}>
            <Link
              href={`/facts/${article.slug}`}
              className="group flex flex-col gap-1 border-[3px] border-gb-ink bg-gb-bg p-4 no-underline shadow-[3px_3px_0_0_var(--gb-ink)] motion-safe:transition-transform motion-safe:hover:-translate-y-0.5"
            >
              <span className="font-pixel text-xs leading-relaxed group-hover:underline">
                {article.question}
              </span>
              <span className="font-body text-lg leading-tight">{article.description}</span>
            </Link>
          </li>
        ))}
      </ul>

      <JsonLd
        data={[
          factsCollectionJsonLd(ARTICLES),
          breadcrumbJsonLd([
            { name: "NOMEKOP", path: "/" },
            { name: "Fun facts", path: "/facts" },
          ]),
        ]}
      />
    </main>
  );
}
