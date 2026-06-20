import type { FaqPage, FaqSetFacts, FaqPokemon } from "@/lib/content/faqs/types";
import { indefiniteArticle, pokemonInSetSlug, setFaqSlug } from "@/lib/content/faqs/slug";
import { cardLabel, cardBullet, money, joinAnd } from "@/lib/content/faqs/format";

export function pokemonInSetPage(s: FaqSetFacts, p: FaqPokemon): FaqPage {
  const slug = pokemonInSetSlug(p.slug, s.slug);
  const article = indefiniteArticle(p.displayName);
  const count = p.cards.length;
  const cards = p.cards;
  const first = cards[0];
  const last = cards[cards.length - 1];
  const description =
    `Yes — there ${count === 1 ? "is" : "are"} ${count} ${p.displayName} ` +
    `card${count === 1 ? "" : "s"} in ${s.name}: ${cards.map(cardLabel).join(", ")}.`;
  const list = cards.map(cardBullet).join("\n");

  const priced = cards.filter((c) => typeof c.marketPrice === "number");
  const headline = priced.length
    ? priced.reduce((a, b) => (b.marketPrice! > a.marketPrice! ? b : a))
    : last;
  const cheapest = priced.length
    ? priced.reduce((a, b) => (b.marketPrice! < a.marketPrice! ? b : a))
    : first;
  const rarities = [...new Set(cards.map((c) => c.rarity).filter(Boolean))] as string[];
  const numbersPhrase =
    count > 1 ? `numbered #${first?.number} through #${last?.number}` : `numbered #${first?.number}`;

  const rangeLine =
    count > 1
      ? `${s.name} runs ${p.displayName} across ${count} prints, ${numbersPhrase}` +
        (rarities.length ? `, spanning ${joinAnd(rarities)}` : "") +
        (priced.length >= 2
          ? `, priced from ${money(Math.min(...priced.map((c) => c.marketPrice!)))} to ` +
            `${money(Math.max(...priced.map((c) => c.marketPrice!)))}.`
          : ".")
      : `${s.name} has just one ${p.displayName}, ${numbersPhrase}` +
        (first?.rarity ? `, ${indefiniteArticle(first.rarity)} ${first.rarity}.` : ".");

  const headlineLine = headline
    ? `The ${p.displayName} to chase is ${cardLabel(headline)}` +
      (headline.rarity ? `, ${headline.rarity}` : "") +
      (typeof headline.marketPrice === "number" ? ` (around ${money(headline.marketPrice)}).` : ".")
    : "";
  const cheapestLine =
    count > 1 && cheapest && cheapest.id !== headline?.id
      ? ` The cheapest way into ${p.displayName} here is ${cardLabel(cheapest)}` +
        (typeof cheapest.marketPrice === "number" ? ` (around ${money(cheapest.marketPrice)}).` : ".")
      : "";

  const body = [
    `**${description}**`,
    "",
    `## ${p.displayName} cards in ${s.name}`,
    "",
    count === 1
      ? `${s.name} includes a single ${p.displayName} print, ${numbersPhrase}:`
      : `${s.name} has ${count} different ${p.displayName} cards, lowest number first:`,
    "",
    list,
    "",
    `## Which ${p.displayName} to chase in ${s.name}`,
    "",
    `${rangeLine} ${headlineLine}${cheapestLine}`,
    "",
    `## How rare is ${p.displayName} in ${s.name}?`,
    "",
    (count === 1
      ? `With only one ${p.displayName} print in ${s.name}, there's a single ${p.displayName} card to ` +
        `track down, ${numbersPhrase}${first?.rarity ? ` (${first.rarity})` : ""}.`
      : `Across the ${count} ${p.displayName} prints, the rarity climbs from the base ` +
        `${cardLabel(cards[0]!)} up to ${cardLabel(last!)}${last?.rarity ? ` (${last.rarity})` : ""}, so ` +
        `the higher-numbered ${p.displayName} cards are the scarce ones.`) +
      ` ${p.displayName} is one of the headline Pokémon collectors single out in this ` +
      `${s.series}-series set.`,
    "",
    `## Building ${article} ${p.displayName} run from ${s.name}`,
    "",
    (count === 1
      ? `Because ${s.name} only has the one ${p.displayName}, it's a quick add to any ${p.displayName} ` +
        `collection — grab ${cardLabel(first!)} and you've got the set's ${p.displayName} covered. With ` +
        `just a single slot to fill, ${p.displayName} won't hold up a ${s.name} run for long, though it ` +
        `may take a few packs (or a single-card order) to land.`
      : `For your ${p.displayName} run, the ${s.name} cards make a tidy mini-set on their own: start with ` +
        `the lowest-numbered ${cardLabel(first!)} and work up to ${cardLabel(last!)}. ` +
        `Together the ${count} prints show how ${p.displayName} was treated across the set's rarity tiers, ` +
        `from the cheap base copy to the full-art chase.`),
    "",
    `## Every ${p.displayName} print, everywhere`,
    "",
    `Want every ${p.displayName} card across all sets, not just ${s.name}? Build a dedicated ` +
      `${p.displayName} binder, line each ${p.displayName} print up side by side, then come back to ` +
      `slot the ${s.name} ${p.displayName} ${count === 1 ? "card" : "cards"} into place. Seeing the ` +
      `${s.name} ${p.displayName} ${count === 1 ? "print" : "prints"} next to ${p.displayName} from ` +
      `other sets is the quickest way to spot which artwork and rarity you're still missing.`,
    "",
    "Figures from the pokemontcg.io dataset (TCGplayer pricing), as of June 2026.",
  ].join("\n");
  return {
    slug, type: "pokemon-in-set", setId: s.id,
    question: `Is there ${article} ${p.displayName} card in ${s.name}?`,
    title: `Is there ${article} ${p.displayName} card in ${s.name}?`,
    description, body,
    cards: p.cards,
    related: [
      ...(first ? [{ href: `/card/${first.id}`, label: `View ${first.name}` }] : []),
      { href: `/pokemon/${p.slug}~34an`, label: `Build a ${p.displayName} binder` },
      { href: setFaqSlug("chase-cards", s.slug), label: `${s.name} chase cards` },
      { href: `/set/${s.id}`, label: `Browse ${s.name}` },
    ],
  };
}
