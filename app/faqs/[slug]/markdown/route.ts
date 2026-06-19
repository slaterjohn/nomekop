import { faqSlugs, getFaqPage } from "@/lib/content/faqs/registry";
import { siteUrl } from "@/lib/site";

export const dynamic = "force-static";

export function generateStaticParams() {
  return faqSlugs.map((slug) => ({ slug }));
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
): Promise<Response> {
  const { slug } = await params;
  const page = getFaqPage(slug);
  if (!page) return new Response("Not found\n", { status: 404 });

  const md = [
    `# ${page.question}`,
    "",
    `> ${page.description}`,
    `>`,
    `> Source: ${siteUrl()}/faqs/${slug} — NOMEKOP, an independent Pokémon TCG binder tool`,
    `> (not affiliated with Nintendo / The Pokémon Company). Figures as of June 2026.`,
    "",
    page.body,
    "",
  ].join("\n");

  return new Response(md, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
      Link: `<${siteUrl()}/faqs/${slug}>; rel="canonical"`,
    },
  });
}
