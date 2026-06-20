import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/json-ld";
import { ALL_FAQ_PAGES, faqSetsWithPages, upcomingSetsWithPages } from "@/lib/content/faqs/registry";
import type { FaqPage } from "@/lib/content/faqs/types";
import { faqsIndexJsonLd } from "@/lib/structured-data";

const TITLE = "Pokémon TCG set FAQs";
const DESCRIPTION =
  "Quick, data-backed answers about the latest and upcoming Pokémon TCG sets — how " +
  "many cards, master set sizes, the best binder size, rarest and chase cards, release " +
  "dates and more.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/faqs" },
  openGraph: { type: "website", title: TITLE, description: DESCRIPTION, url: "/faqs" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

/** A list of FAQ link-cards (shared by the upcoming + released groups). */
function PageCards({ pages }: { pages: FaqPage[] }) {
  return (
    <ul className="flex list-none flex-col gap-2 p-0">
      {pages.map((page) => (
        <li key={page.slug}>
          <Link
            href={`/faqs/${page.slug}`}
            className="group flex flex-col gap-0.5 border-[3px] border-gb-ink bg-gb-bg p-3 no-underline shadow-[3px_3px_0_0_var(--gb-ink)] motion-safe:transition-transform motion-safe:hover:-translate-y-0.5"
          >
            <span className="font-readable text-base font-bold leading-snug group-hover:underline">
              {page.question}
            </span>
            <span className="font-readable text-base leading-snug">{page.description}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** Blog-style FAQ index: upcoming sets first (timely), then released sets newest-first. */
export default function FaqsIndexPage() {
  const upcoming = upcomingSetsWithPages();
  const groups = faqSetsWithPages();
  return (
    <main id="main" className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6">
      <header className="flex flex-col gap-2">
        <h1 className="font-pixel text-lg uppercase leading-relaxed sm:text-xl">{TITLE}</h1>
        <p className="font-readable text-lg leading-snug">{DESCRIPTION}</p>
      </header>

      {upcoming.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="font-pixel text-sm uppercase leading-relaxed">Upcoming sets</h2>
          {upcoming.map(({ set, pages }) => (
            <div key={set.id} className="flex flex-col gap-2">
              <h3 className="font-readable text-base font-bold leading-snug">
                {set.name}{" "}
                <span className="font-readable text-sm font-normal text-gb-muted">
                  · {set.releaseLabel}
                </span>
              </h3>
              <PageCards pages={pages} />
            </div>
          ))}
        </section>
      )}

      {groups.map(({ set, pages }) => (
        <section key={set.id} className="flex flex-col gap-2">
          <h2 className="font-pixel text-sm leading-relaxed">
            <Link href={`/set/${set.id}`} className="no-underline hover:underline">
              {set.name}
            </Link>
          </h2>
          <PageCards pages={pages} />
        </section>
      ))}

      <JsonLd
        data={faqsIndexJsonLd(
          ALL_FAQ_PAGES.map((p) => ({ slug: p.slug, question: p.question, description: p.description })),
        )}
      />
    </main>
  );
}
