import type { Metadata } from "next";
import Link from "next/link";
import { ARTICLES } from "@/lib/content/articles";
import { JsonLd } from "@/components/json-ld";
import { factsCollectionJsonLd } from "@/lib/structured-data";

export const metadata: Metadata = {
  title: "Pokémon TCG fun facts & trivia",
  description:
    "Data-driven Pokémon TCG trivia from NOMEKOP — the first Pikachu card, how many Charizard cards exist, the most prolific illustrators, biggest sets and more.",
  alternates: { canonical: "/facts" },
};

/** The fun-facts library: one card per DB-driven trivia article. */
export default function FactsIndexPage() {
  return (
    <main id="main" className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-6">
      <h1 className="font-pixel text-lg leading-relaxed sm:text-xl">FUN FACTS</h1>
      <p className="font-body text-xl leading-tight">
        Bite-sized Pokémon TCG trivia, straight from the card database that powers NOMEKOP. Every
        figure is real — and every answer is also available as Markdown for your favourite AI.
      </p>

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

      <JsonLd data={factsCollectionJsonLd(ARTICLES)} />
    </main>
  );
}
