import type { FaqPage, FaqSetFacts, FaqPokemon } from "@/lib/content/faqs/types";
import { indefiniteArticle, pokemonInSetSlug, setFaqSlug } from "@/lib/content/faqs/slug";
import { cardLabel } from "@/lib/content/faqs/format";

export function pokemonInSetPage(s: FaqSetFacts, p: FaqPokemon): FaqPage {
  const slug = pokemonInSetSlug(p.slug, s.slug);
  const article = indefiniteArticle(p.displayName);
  const count = p.cards.length;
  const description =
    `Yes — there ${count === 1 ? "is" : "are"} ${count} ${p.displayName} ` +
    `card${count === 1 ? "" : "s"} in ${s.name}: ${p.cards.map(cardLabel).join(", ")}.`;
  const list = p.cards.map((c) => `- [${cardLabel(c)}${c.rarity ? ` — ${c.rarity}` : ""}](/card/${c.id})`).join("\n");
  const body = [
    `**${description}**`,
    "",
    count === 1
      ? `${s.name} has a single ${p.displayName} card:`
      : `${s.name} features ${count} different ${p.displayName} cards:`,
    "",
    list,
    "",
    `Want every ${p.displayName} print across all sets, not just ${s.name}? Build a dedicated ` +
      `${p.displayName} binder and see them side by side.`,
    "",
    "Figures from the pokemontcg.io dataset, as of June 2026.",
  ].join("\n");
  return {
    slug, type: "pokemon-in-set", setId: s.id,
    question: `Is there ${article} ${p.displayName} card in ${s.name}?`,
    title: `Is there ${article} ${p.displayName} card in ${s.name}?`,
    description, body,
    related: [
      { href: `/card/${p.cards[0]!.id}`, label: `View ${p.cards[0]!.name}` },
      { href: `/pokemon/${p.slug}~34an`, label: `Build a ${p.displayName} binder` },
      { href: setFaqSlug("chase-cards", s.slug), label: `${s.name} chase cards` },
      { href: `/set/${s.id}`, label: `Browse ${s.name}` },
    ],
  };
}
