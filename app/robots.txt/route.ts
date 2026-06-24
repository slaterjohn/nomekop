import { siteUrl } from "@/lib/site";

// robots.txt, owned in code (Cloudflare's managed robots.txt must be turned OFF
// so this is the only one served). Policy: search indexing is welcome; AI may
// USE our content to answer questions WITH A CITATION (ai-input=yes) but may NOT
// train models on it (ai-train=no). So the AI answer/search engines (Google
// AI / Gemini, ChatGPT search, Claude, Perplexity, …) fall under the permissive
// `*` group, while the bulk model-training scrapers are blocked outright.
export const dynamic = "force-static";

/** Crawlers that exist primarily to harvest content for AI MODEL TRAINING — kept
 *  blocked to honour the no-training stance (these largely ignore Content-Signal,
 *  so a hard Disallow is the only effective lever). Note Applebot / Googlebot
 *  (plain search) stay allowed — only the *-Extended / AI-training variants are
 *  blocked here. */
const TRAINING_SCRAPERS = [
  "CCBot", // Common Crawl — feeds most public training datasets
  "Bytespider", // ByteDance
  "Amazonbot",
  "Applebot-Extended", // Apple's AI-training crawler (Applebot search stays allowed)
  "meta-externalagent", // Meta AI (Llama) training
];

export function GET(): Response {
  const base = siteUrl();
  const body = [
    "# Content signals — an express reservation of rights under Article 4 of EU",
    "# Directive 2019/790 (Copyright in the Digital Single Market):",
    "#   search=yes    indexing and search results are allowed",
    "#   ai-input=yes  using our content to answer queries WITH citation is allowed",
    "#   ai-train=no   training or fine-tuning AI models is NOT allowed",
    "",
    "User-agent: *",
    "Content-Signal: search=yes,ai-input=yes,ai-train=no",
    "Allow: /",
    "Disallow: /api/",
    "Disallow: /print/",
    "Disallow: /collection/",
    "Disallow: /b/",
    "",
    "# Model-training crawlers — disallowed (we permit AI answers, not training).",
    ...TRAINING_SCRAPERS.flatMap((bot) => [`User-agent: ${bot}`, "Disallow: /", ""]),
    `Sitemap: ${base}/sitemap_index.xml`,
    "",
  ].join("\n");

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=86400",
    },
  });
}
