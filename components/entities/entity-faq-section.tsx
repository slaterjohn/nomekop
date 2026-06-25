import type { FaqEntry } from "@/lib/content/entities/faq";

/** Data-backed Q&A for an entity page. The markup mirrors the entries passed to
 *  faqJsonLd verbatim, as Google's FAQPage policy requires. Renders nothing when
 *  there are no entries. */
export function EntityFaqSection({ heading, entries }: { heading: string; entries: FaqEntry[] }) {
  if (entries.length === 0) return null;
  return (
    <section aria-label={heading} className="mt-6 flex flex-col gap-3">
      <h2 className="font-pixel text-sm leading-relaxed">{heading}</h2>
      <dl className="m-0 flex flex-col gap-3">
        {entries.map((e) => (
          <div key={e.question}>
            <dt className="font-body text-lg font-semibold leading-snug">{e.question}</dt>
            <dd className="m-0 font-body text-lg leading-snug">{e.answer}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
