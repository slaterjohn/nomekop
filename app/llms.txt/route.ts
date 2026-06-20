import { ARTICLES } from "@/lib/content/articles";
import { ALL_FAQ_PAGES } from "@/lib/content/faqs/registry";
import { SITE_DESCRIPTION, siteUrl } from "@/lib/site";
import { STATS_AS_OF } from "@/lib/content/stats";

export const dynamic = "force-static";

/**
 * /llms.txt — the emerging convention for telling LLMs and AI search what a
 * site is and where its best content lives. Lists the key pages plus every
 * fun-fact article alongside its Markdown companion.
 */
export function GET(): Response {
  const base = siteUrl();
  const lines = [
    "# NOMEKOP",
    "",
    `> ${SITE_DESCRIPTION}`,
    "",
    "NOMEKOP is a free, independent fan-made Pokémon TCG binder layout tool.",
    "It is NOT affiliated with Nintendo, Game Freak, Creatures Inc., or The Pokémon Company.",
    "Card data and prices come from the pokemontcg.io API (TCGplayer pricing); figures as of " +
      STATS_AS_OF +
      ".",
    "",
    "## Key pages",
    `- [Pokémon binders](${base}/pokemon): every card of one Pokémon across all sets.`,
    `- [Pokédex binders](${base}/pokedex): one pocket per Pokémon in National Dex order.`,
    `- [Illustrator binders](${base}/illustrator): every card drawn by one artist.`,
    `- [Sets](${base}/sets): every expansion with card lists and page counts — browse a set and build a printable binder layout, standard or master, with reverse holos and ball patterns.`,
    `- [Fun facts](${base}/facts): data-driven Pokémon TCG trivia.`,
    `- [Set FAQs](${base}/faqs): per-set answers — card counts, master sets, binder sizes, rarest & chase cards.`,
    `- [Legal & credits](${base}/legal): data sources and disclaimers.`,
    "",
    "## Data freshness",
    `- Dataset snapshot: ${STATS_AS_OF}`,
    "- Source: pokemontcg.io API (TCGplayer pricing)",
    `- All counts and figures below are current as of ${STATS_AS_OF}.`,
    "",
    "## Fun-fact articles (each has a Markdown version)",
    ...ARTICLES.map(
      (a) => `- [${a.question}](${base}/facts/${a.slug}): ${a.description} Markdown: ${base}/facts/${a.slug}/markdown`,
    ),
    "",
    "## Per-set FAQ pages (each has a Markdown version)",
    ...ALL_FAQ_PAGES.map(
      (p) => `- [${p.question}](${base}/faqs/${p.slug}): ${p.description} Markdown: ${base}/faqs/${p.slug}/markdown`,
    ),
    "",
  ];

  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
