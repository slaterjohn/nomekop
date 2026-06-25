import { marked } from "marked";
import { linkifyEntities } from "@/lib/content/linkify";
import { entityIconSvg, entityTypeForHref, ENTITY_LINK_CLASS } from "@/lib/content/entity-icons";

marked.setOptions({ gfm: true });

// Typed-link renderer: internal links to /pokemon, /illustrator, /set and /card
// get a pixel icon + a type-specific underline so the link type reads at a
// glance (the "Wikipedia effect" web). All other links fall through to marked's
// default renderer (return false).
marked.use({
  renderer: {
    link(token) {
      const href = token.href ?? "";
      const type = entityTypeForHref(href);
      if (!type) return false;
      return `<a href="${href}" class="${ENTITY_LINK_CLASS[type]}">${entityIconSvg(type)}${token.text}</a>`;
    },
  },
});

/**
 * Render trusted Markdown (facts articles, FAQ bodies) to HTML. Bodies are
 * authored in-repo (no user input), so injecting the result is safe.
 *
 * With `linkify`, the first mention of any known Pokémon / illustrator is wrapped
 * in a typed internal link before rendering (lib/content/linkify.ts) — turning
 * plain prose into the cross-linked web.
 */
export function renderMarkdown(md: string, opts?: { linkify?: boolean }): string {
  const src = opts?.linkify ? linkifyEntities(md) : md;
  return marked.parse(src, { async: false });
}
