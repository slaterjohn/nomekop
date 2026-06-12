import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GbLinkButton } from "@/components/gb/gb-button";
import { JsonLd } from "@/components/json-ld";
import { articleSlugs, getArticle } from "@/lib/content/articles";
import { renderMarkdown } from "@/lib/content/render";
import { STATS_AS_OF } from "@/lib/content/stats";
import { articleJsonLd, breadcrumbJsonLd } from "@/lib/structured-data";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return articleSlugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) return { title: "Fun fact" };
  return {
    title: article.title,
    description: article.description,
    alternates: { canonical: `/facts/${slug}` },
    openGraph: {
      type: "article",
      title: article.title,
      description: article.description,
      url: `/facts/${slug}`,
    },
  };
}

/** A single fun-fact article: answer-first prose, a Markdown companion link for
 *  LLMs, and Article + FAQ structured data. */
export default async function FactPage({ params }: Props) {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) notFound();
  const html = renderMarkdown(article.body);

  return (
    <main id="main" className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-6">
      <nav aria-label="Breadcrumb" className="font-pixel text-sm">
        <Link href="/facts" className="no-underline">
          ◂ FUN FACTS
        </Link>
      </nav>

      <h1 className="font-pixel text-lg leading-relaxed sm:text-xl">{article.question}</h1>

      <div className="flex flex-wrap items-center gap-2 border-[3px] border-gb-ink bg-gb-accent/30 px-3 py-2">
        <a
          href={`/facts/${slug}/markdown`}
          className="inline-flex items-center border-[3px] border-gb-ink bg-gb-bg px-2 py-1 font-pixel text-[10px] no-underline"
        >
          READ AS MARKDOWN ▸
        </a>
        <span className="font-body text-lg leading-tight text-gb-ink">
          A plain-text version for LLMs &amp; AI search. Figures as of {STATS_AS_OF}.
        </span>
      </div>

      <article
        className="flex flex-col [&_a]:underline [&_a]:underline-offset-2 [&_h2]:mt-6 [&_h2]:font-pixel [&_h2]:text-sm [&_h2]:leading-relaxed [&_hr]:my-5 [&_hr]:border-gb-ink/30 [&_p]:mb-3 [&_p]:font-body [&_p]:text-xl [&_p]:leading-relaxed [&_strong]:font-semibold [&_ul]:mb-3 [&_ul]:flex [&_ul]:list-disc [&_ul]:flex-col [&_ul]:gap-1 [&_ul]:pl-6"
        dangerouslySetInnerHTML={{ __html: html }}
      />

      <div className="mt-2">
        <GbLinkButton href={article.related.href} variant="a">
          {article.related.label} ▶
        </GbLinkButton>
      </div>

      <JsonLd
        data={[
          ...articleJsonLd(article),
          breadcrumbJsonLd([
            { name: "NOMEKOP", path: "/" },
            { name: "FUN FACTS", path: "/facts" },
            { name: article.question, path: `/facts/${slug}` },
          ]),
        ]}
      />
    </main>
  );
}
