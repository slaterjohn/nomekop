import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GbLinkButton } from "@/components/gb/gb-button";
import { JsonLd } from "@/components/json-ld";
import { renderMarkdown } from "@/lib/content/render";
import { faqSlugs, getFaqPage, faqPagesForSet, FAQ_SETS } from "@/lib/content/faqs/registry";
import { breadcrumbJsonLd, faqPageJsonLd } from "@/lib/structured-data";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return faqSlugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const page = getFaqPage(slug);
  if (!page) return { title: "FAQ" };
  return {
    title: page.title,
    description: page.description,
    alternates: { canonical: `/faqs/${slug}` },
    openGraph: { type: "article", title: page.title, description: page.description, url: `/faqs/${slug}` },
  };
}

/** An FAQ page that points at another FAQ uses a bare slug as its href; turn
 *  those into /faqs/<slug>, and leave app routes (/set, /card, …) untouched. */
function hrefFor(href: string): string {
  return /^(https?:|\/)/.test(href) ? href : `/faqs/${href}`;
}

export default async function FaqPage({ params }: Props) {
  const { slug } = await params;
  const page = getFaqPage(slug);
  if (!page) notFound();
  const html = renderMarkdown(page.body);
  const set = FAQ_SETS.find((s) => s.id === page.setId);
  const siblings = faqPagesForSet(page.setId).filter((p) => p.slug !== page.slug);

  return (
    <main id="main" className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-6">
      <nav aria-label="Breadcrumb" className="font-pixel text-sm">
        <Link href="/faqs" className="no-underline">◂ FAQs</Link>
      </nav>

      <h1 className="font-pixel text-lg leading-relaxed sm:text-xl">{page.question}</h1>

      <div className="flex flex-wrap items-center gap-2 border-[3px] border-gb-ink bg-gb-accent/30 px-3 py-2">
        <a
          href={`/faqs/${slug}/markdown`}
          className="inline-flex items-center border-[3px] border-gb-ink bg-gb-bg px-2 py-1 font-pixel text-[10px] no-underline"
        >
          READ AS MARKDOWN ▸
        </a>
        <span className="font-body text-lg leading-tight text-gb-ink">
          A plain-text version for LLMs &amp; AI search.
        </span>
      </div>

      <article
        className="flex flex-col [&_a]:underline [&_a]:underline-offset-2 [&_h2]:mt-6 [&_h2]:font-pixel [&_h2]:text-sm [&_table]:my-2 [&_table]:border-collapse [&_td]:border [&_td]:border-gb-ink/40 [&_td]:px-2 [&_td]:py-1 [&_th]:border [&_th]:border-gb-ink/40 [&_th]:px-2 [&_th]:py-1 [&_li]:font-body [&_li]:text-lg [&_p]:mb-3 [&_p]:font-body [&_p]:text-xl [&_p]:leading-relaxed [&_strong]:font-semibold [&_ul]:mb-3 [&_ul]:flex [&_ul]:list-disc [&_ul]:flex-col [&_ul]:gap-1 [&_ul]:pl-6"
        dangerouslySetInnerHTML={{ __html: html }}
      />

      {page.related.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {page.related.map((r) => (
            <GbLinkButton key={r.href} href={hrefFor(r.href)} variant="a" size="sm">
              {r.label} ▸
            </GbLinkButton>
          ))}
        </div>
      )}

      {siblings.length > 0 && set && (
        <nav aria-label={`More about ${set.name}`} className="mt-2 flex flex-col gap-2 border-t-[3px] border-gb-ink pt-4">
          <h2 className="font-pixel text-sm leading-relaxed">More about {set.name}</h2>
          <ul className="flex list-none flex-col gap-1 p-0">
            {siblings.map((s) => (
              <li key={s.slug}>
                <Link href={`/faqs/${s.slug}`} className="font-body text-lg underline underline-offset-2">
                  {s.question}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}

      <JsonLd
        data={[
          faqPageJsonLd(page.question, page.description),
          breadcrumbJsonLd([
            { name: "NOMEKOP", path: "/" },
            { name: "FAQs", path: "/faqs" },
            { name: page.question, path: `/faqs/${slug}` },
          ]),
        ]}
      />
    </main>
  );
}
