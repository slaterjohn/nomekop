import { articleSlugs, getArticle } from "@/lib/content/articles";
import { STATS_AS_OF } from "@/lib/content/stats";
import { siteUrl } from "@/lib/site";

export const dynamic = "force-static";

export function generateStaticParams() {
  return articleSlugs.map((slug) => ({ slug }));
}

/**
 * The Markdown companion for an article — the same content as the HTML post,
 * plain-text and source-attributed, so LLMs and AI search can quote it cleanly.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
): Promise<Response> {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) return new Response("Not found\n", { status: 404 });

  const md = [
    `# ${article.question}`,
    "",
    `> ${article.description}`,
    `>`,
    `> Source: ${siteUrl()}/facts/${slug} — NOMEKOP, an independent Pokémon TCG binder tool`,
    `> (not affiliated with Nintendo / The Pokémon Company). Figures as of ${STATS_AS_OF}.`,
    "",
    article.body,
    "",
  ].join("\n");

  return new Response(md, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
      // Point search engines at the HTML article as the canonical of this
      // non-HTML variant (the HTML page already carries its own canonical), and
      // keep the near-duplicate Markdown out of the index — it exists for LLMs.
      Link: `<${siteUrl()}/facts/${slug}>; rel="canonical"`,
      "X-Robots-Tag": "noindex",
    },
  });
}
